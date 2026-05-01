export const handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on this server.' }),
        }
    }

    let pairs
    try {
        pairs = JSON.parse(event.body).pairs
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) }
    }

    if (!Array.isArray(pairs) || pairs.length === 0) {
        return { statusCode: 200, body: JSON.stringify({ confirmed: [] }) }
    }

    // Build prompt asking Haiku to confirm each candidate pair
    const pairList = pairs.map((p, i) => {
        const condsA = (p.a.conditions || []).join(', ') || 'none'
        const condsB = (p.b.conditions || []).join(', ') || 'none'
        return [
            `Pair ${i + 1} [flagged: ${p.heuristic}]`,
            `  A: ${p.a.name} | ${condsA} | "${p.a.excerpt}"`,
            `  B: ${p.b.name} | ${condsB} | "${p.b.excerpt}"`,
        ].join('\n')
    }).join('\n\n')

    const prompt = `You are reviewing suspected duplicate testimonials. For each pair below, decide if they are genuine duplicates — the same person submitting the same story more than once (possibly with minor differences).

${pairList}

Return ONLY a JSON array of confirmed duplicate pairs. Each entry: {"index": <pair number minus 1>, "reason": "<one short sentence>"}
If none are confirmed, return [].
No explanation, no markdown — only the raw JSON array.`

    try {
        console.log(`Confirming ${pairs.length} candidate pair(s) with Haiku`)

        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key':         apiKey,
                'anthropic-version': '2023-06-01',
                'content-type':      'application/json',
            },
            body: JSON.stringify({
                model:      'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                messages:   [{ role: 'user', content: prompt }],
            }),
        })

        console.log('Anthropic response status:', resp.status)

        if (!resp.ok) {
            const errBody = await resp.json().catch(() => ({}))
            const errType = errBody?.error?.type || ''
            console.log('Anthropic error body:', JSON.stringify(errBody))

            if (resp.status === 429 || errType === 'rate_limit_error') {
                return {
                    statusCode: 429,
                    body: JSON.stringify({ error: 'rate_limit', message: 'Anthropic rate limit reached. Wait a minute and try again.' }),
                }
            }
            if (resp.status === 529 || errType === 'overloaded_error') {
                return {
                    statusCode: 529,
                    body: JSON.stringify({ error: 'overloaded', message: 'Anthropic API is overloaded right now. Try again in a moment.' }),
                }
            }
            if (errType === 'billing_error' || errBody?.error?.message?.toLowerCase().includes('credit')) {
                return {
                    statusCode: 402,
                    body: JSON.stringify({ error: 'billing', message: 'Anthropic API credits exhausted. Top up at console.anthropic.com.' }),
                }
            }

            return {
                statusCode: 502,
                body: JSON.stringify({ error: 'api_error', message: `Anthropic API error (${resp.status})` }),
            }
        }

        const data = await resp.json()
        const text = data.content?.[0]?.text || '[]'

        let confirmed
        try {
            confirmed = JSON.parse(text)
        } catch {
            const match = text.match(/\[[\s\S]*\]/)
            confirmed = match ? JSON.parse(match[0]) : []
        }

        // Map confirmed indices back to pair ids
        const result = confirmed
            .filter(c => c.index >= 0 && c.index < pairs.length)
            .map(c => ({
                a_id:   pairs[c.index].a.id,
                b_id:   pairs[c.index].b.id,
                reason: c.reason,
            }))

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmed: result }),
        }
    } catch (err) {
        console.log('Caught error:', err.message, err.stack)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        }
    }
}
