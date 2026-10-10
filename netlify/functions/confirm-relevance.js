// Relevance confirmation pass for the admin "Ask AI" search.
// The client gathers candidates generously (condition/product TAGS *or* story-text
// keywords) for recall, then sends each chunk of candidates here with the original
// question. Claude keeps only the genuinely-relevant ones (precision) — this is what
// lets honest-empty beat the old AND→OR fallback that surfaced unrelated stories.
// POST { query, interpretation, logic, candidates: [{ id, name, conditions, products, text }] }
// → { relevant: [{ id, reason }] }

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on this server.' }) }
    }

    let query, interpretation, logic, candidates
    try {
        ({ query, interpretation = '', logic = 'OR', candidates } = JSON.parse(event.body))
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) }
    }

    if (!query || !query.trim()) {
        return { statusCode: 400, body: JSON.stringify({ error: 'empty_query' }) }
    }
    if (!Array.isArray(candidates) || candidates.length === 0) {
        return { statusCode: 200, body: JSON.stringify({ relevant: [] }) }
    }

    const list = candidates.map((c, i) => {
        const conds = (c.conditions || []).join(', ') || 'none'
        const prods = (c.products || []).join(', ') || 'none'
        return [
            `[${i}] ${c.name || 'Unknown'}`,
            `    tagged conditions: ${conds}`,
            `    tagged products: ${prods}`,
            `    story: "${(c.text || '').replace(/\s+/g, ' ').trim()}"`,
        ].join('\n')
    }).join('\n\n')

    const combo = (logic === 'AND')
        ? `The question asks for a COMBINATION. Keep a testimonial ONLY if its story genuinely involves EVERY part of the question together (for "type 1 diabetes that talks about eye issues", the SAME person's story must involve both the diabetes and the eye issue — not a story about just one of them).`
        : `Keep a testimonial if its story genuinely relates to what the admin is looking for.`

    const prompt = `You are helping an admin find genuinely relevant stories in a Mannatech health-testimonial database.

The admin searched for: "${query.trim()}"${interpretation ? `\nInterpreted as: ${interpretation}` : ''}

Below are candidate testimonials. They matched on a tag or a keyword, but some are false matches — a keyword may appear incidentally (e.g. "stroke" meaning a stroke of luck, or a swimming stroke), or the story may relate to only part of the question.

${combo}

Candidates:
${list}

Return ONLY a raw JSON array of the candidates that genuinely match, each entry {"index": <the [n] number>, "reason": "<one short sentence citing what in the story makes it relevant>"}. If none genuinely match, return []. No markdown, no commentary — only the JSON array.`

    try {
        console.log(`Confirming relevance of ${candidates.length} candidate(s) with Haiku`)

        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key':         apiKey,
                'anthropic-version': '2023-06-01',
                'content-type':      'application/json',
            },
            body: JSON.stringify({
                model:      'claude-haiku-4-5-20251001',
                max_tokens: 2048,
                messages:   [{ role: 'user', content: prompt }],
            }),
        })

        console.log('Anthropic response status:', resp.status)

        if (!resp.ok) {
            const errBody = await resp.json().catch(() => ({}))
            const errType = errBody?.error?.type || ''
            console.log('Anthropic error body:', JSON.stringify(errBody))

            if (resp.status === 429 || errType === 'rate_limit_error') {
                return { statusCode: 429, body: JSON.stringify({ error: 'rate_limit', message: 'Anthropic rate limit reached. Wait a moment and try again.' }) }
            }
            if (resp.status === 529 || errType === 'overloaded_error') {
                return { statusCode: 529, body: JSON.stringify({ error: 'overloaded', message: 'The AI is busy right now — try again in a moment.' }) }
            }
            if (errType === 'billing_error' || errBody?.error?.message?.toLowerCase().includes('credit')) {
                return { statusCode: 402, body: JSON.stringify({ error: 'billing', message: 'Anthropic API credits exhausted.' }) }
            }
            return { statusCode: 502, body: JSON.stringify({ error: 'api_error', message: `Anthropic API error (${resp.status})` }) }
        }

        const data = await resp.json()
        const text = data.content?.[0]?.text || '[]'

        let parsed
        try {
            parsed = JSON.parse(text)
        } catch {
            const match = text.match(/\[[\s\S]*\]/)
            parsed = match ? JSON.parse(match[0]) : []
        }

        const relevant = (Array.isArray(parsed) ? parsed : [])
            .filter(r => Number.isInteger(r.index) && r.index >= 0 && r.index < candidates.length)
            .map(r => ({ id: candidates[r.index].id, reason: r.reason || '' }))

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relevant }),
        }
    } catch (err) {
        console.log('Caught error:', err.message, err.stack)
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
}
