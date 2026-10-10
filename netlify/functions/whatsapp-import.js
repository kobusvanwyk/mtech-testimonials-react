// Netlify function: enriches parsed WhatsApp messages via Claude API
// POST body: { messages: [{ id, sender, timestamp, text }] }
// Returns: { results: [{ id, enriched, skipped, reason }] }

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const PRODUCTS = [
  'Advanced Ambrotose', 'Ambrotose AO', 'Ambrotose Complex', 'BounceBack',
  'Cardio Balance', 'Catalyst', 'EM•PACT', 'Emprizone Hydrating Gel',
  'FIRM with Ambrotose Crème', 'GI-ProBalance', 'GI-Zyme', 'GlycoCafé',
  'ImmunoSTART', 'Luminovation First Essential Toner',
  'Luminovation Luminous Essence Lotion', 'Luminovation Purifying Deep Cleanser',
  'Luminovation Youth Intensive Cream', 'Manapol', 'Manna-C', 'MannaBears',
  'MannaCLEANSE', 'NutriVerus', 'Omega 3', 'OsoLean', 'PhytoMatrix', 'PLUS',
  'Superfood Greens and Reds', 'TruPLENISH',
]

// Max messages accepted per function call. Kept small so each invocation stays
// well under the serverless time limit (~3.5s/message; 10s synchronous cap in prod).
const MAX_PER_CALL = 2

function buildPrompt(messages) {
  const productList = PRODUCTS.join(', ')
  // Deliberately omit the WhatsApp sender — it's the forwarder, not the author,
  // and including it tempts the model to misattribute the testimonial.
  const msgBlock = messages.map((m, i) =>
    `--- MESSAGE ${i + 1} (ID: ${m.id}) ---\nTimestamp: ${m.timestamp}\nText: ${m.text}`
  ).join('\n\n')

  return `You are processing WhatsApp messages from a Mannatech health product testimonials group in South Africa. Your job is to determine if each message is a genuine health testimonial, and if so, extract and format the content.

Official Mannatech product list (match names exactly from this list only):
${productList}

IMPORTANT — about authorship: These messages are collected and forwarded into a WhatsApp group by one administrator, so the author's name is usually NOT present. Use a name ONLY when it is clearly the storyteller's own signature — typically a sign-off at the very start or end of the message (e.g. "🌼Neelke- Pta", "Groete, Lauriza", "Dawie se getuienis"). Do NOT use a name that is merely mentioned inside the story, such as the person who introduced them to the products, a doctor, a friend, or a family member (e.g. "a friend Dalene introduced me" → Dalene is NOT the author). If there is no clear author signature, set person_name to null and anonymous to true. When uncertain, prefer null/anonymous.

For each message, return a JSON object with these fields:
- "id": the message ID provided (copy it exactly)
- "is_testimonial": true if this is a genuine health/product testimonial, false if it's a chat message, greeting, voice note reference, logistics message, or anything else
- "skip_reason": if is_testimonial is false, brief reason why (e.g. "greeting", "short reply", "media only", "logistics"). Omit if is_testimonial is true.
- "person_name": the author's name ONLY if it appears within the testimonial text itself. Never the WhatsApp sender/forwarder. If no name is stated in the text, use null.
- "anonymous": true if no author name appears in the text (or the person explicitly asks to remain anonymous); false only when a real author name is present in the text.
- "title": a concise, descriptive title for the testimonial (max 10 words, no quotes)
- "conditions": array of health conditions mentioned (e.g. ["Arthritis", "High Blood Pressure"]). Use proper names, not abbreviations. Empty array if none.
- "products": array of Mannatech products mentioned — match ONLY to the official product list above. Empty array if none mentioned or none match.
- "story_text": the testimonial text cleaned up and formatted with proper paragraphs. Fix obvious typos. Keep the person's voice. Do not add information not in the original.
- "review_notes": string with any flags for manual review (e.g. "Product name unclear — could be Ambrotose AO or Ambrotose Complex", "Name not mentioned — used sender name"). Omit if nothing to flag.

Return a raw JSON array — no markdown, no explanation, just the array.

Messages to process:

${msgBlock}`
}

async function enrichBatch(messages) {
  const prompt = buildPrompt(messages)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const type = err?.error?.type || ''
    if (response.status === 429 || type === 'rate_limit_error') throw { code: 'rate_limit' }
    if (response.status === 529 || type === 'overloaded_error') throw { code: 'overloaded' }
    if (type === 'billing_error' || err?.error?.message?.includes('credit')) throw { code: 'billing' }
    throw { code: 'api_error', status: response.status }
  }

  const data = await response.json()
  const text = data.content[0].text

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Claude returned non-JSON response')
    parsed = JSON.parse(match[0])
  }

  return parsed
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { messages } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'messages array required' }) }
  }

  // Guard the serverless time limit (10s synchronous in production). The client
  // sends small chunks; reject anything large so a single call stays fast.
  if (messages.length > MAX_PER_CALL) {
    return { statusCode: 400, body: JSON.stringify({ error: `too_many: send at most ${MAX_PER_CALL} messages per call` }) }
  }

  try {
    // One Claude call per request — the client orchestrates chunking + progress.
    const results = await enrichBatch(messages)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    }
  } catch (err) {
    if (err.code === 'rate_limit') {
      return { statusCode: 429, body: JSON.stringify({ error: 'rate_limit' }) }
    }
    if (err.code === 'overloaded') {
      return { statusCode: 529, body: JSON.stringify({ error: 'overloaded' }) }
    }
    if (err.code === 'billing') {
      return { statusCode: 402, body: JSON.stringify({ error: 'billing' }) }
    }
    console.error('whatsapp-import error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
