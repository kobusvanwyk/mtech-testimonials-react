// Natural-language testimonial search (admin "Ask AI").
// Takes a free-text question + the available condition/product taxonomy and
// returns a structured search intent. The client does the actual filtering.
// POST { query, conditions: [...], products: [...] }
// → { groups: [{ label, conditions, products, keywords }], logic, interpretation }

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured.' }) }
    }

    let query, conditions, products
    try {
        ({ query, conditions = [], products = [] } = JSON.parse(event.body))
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) }
    }

    if (!query || !query.trim()) {
        return { statusCode: 400, body: JSON.stringify({ error: 'empty_query' }) }
    }

    const prompt = `You help an admin search a Mannatech health-testimonial database using natural language.

Available CONDITIONS (use only these exact names when matching):
${conditions.join(', ') || '(none)'}

Available PRODUCTS (use only these exact names when matching):
${products.join(', ') || '(none)'}

User question: "${query.trim()}"

Break the question into one or more concept GROUPS. For example "type 1 diabetes relating to foot conditions" has two groups: a diabetes group and a foot group. For each group return:
- "label": a short human label for the group
- "conditions": condition names taken EXACTLY from the list above that are the SAME concept or a direct sub-type (not loosely related). Or [].
- "products": product names taken EXACTLY from the list above ONLY IF the user's question explicitly names a product or product type. If the question is about conditions/symptoms and does not mention a product, this MUST be []. NEVER add a product just because it is commonly associated with the condition.
- "keywords": 3-8 SPECIFIC lowercase terms that strongly and distinctively indicate THIS concept — prefer precise nouns (for feet: "foot","feet","toe","toes","heel","ankle","sole"). Do NOT include generic medical words that appear across many unrelated stories (avoid: "wound","injury","pain","infection","condition","problem","recovery","healing","swelling","inflammation").

Also return:
- "logic": "AND" if a matching testimonial must relate to ALL groups (phrases like "X relating to Y", "X with Y"), otherwise "OR"
- "interpretation": one short sentence describing what you searched for

Return ONLY raw JSON in this exact shape, no markdown:
{"groups":[{"label":"","conditions":[],"products":[],"keywords":[]}],"logic":"AND","interpretation":""}`

    try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }],
            }),
        })

        if (!resp.ok) {
            const errBody = await resp.json().catch(() => ({}))
            const errType = errBody?.error?.type || ''
            if (resp.status === 429 || errType === 'rate_limit_error') {
                return { statusCode: 429, body: JSON.stringify({ error: 'rate_limit', message: 'Rate limit reached — wait a moment and try again.' }) }
            }
            if (resp.status === 529 || errType === 'overloaded_error') {
                return { statusCode: 529, body: JSON.stringify({ error: 'overloaded', message: 'The AI is busy right now — try again in a moment.' }) }
            }
            if (errType === 'billing_error' || errBody?.error?.message?.toLowerCase().includes('credit')) {
                return { statusCode: 402, body: JSON.stringify({ error: 'billing', message: 'Anthropic API credits exhausted.' }) }
            }
            return { statusCode: 502, body: JSON.stringify({ error: 'api_error', message: `AI error (${resp.status})` }) }
        }

        const data = await resp.json()
        const text = data.content?.[0]?.text || '{}'

        let parsed
        try {
            parsed = JSON.parse(text)
        } catch {
            const match = text.match(/\{[\s\S]*\}/)
            parsed = match ? JSON.parse(match[0]) : { groups: [], logic: 'OR', interpretation: '' }
        }

        // Normalise shape
        const groups = Array.isArray(parsed.groups) ? parsed.groups.map(g => ({
            label: g.label || '',
            conditions: Array.isArray(g.conditions) ? g.conditions : [],
            products: Array.isArray(g.products) ? g.products : [],
            keywords: Array.isArray(g.keywords) ? g.keywords : [],
        })) : []

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groups,
                logic: parsed.logic === 'AND' ? 'AND' : 'OR',
                interpretation: parsed.interpretation || '',
            }),
        }
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
}
