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

    let testimonials
    try {
        testimonials = JSON.parse(event.body).testimonials
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) }
    }

    if (!Array.isArray(testimonials) || testimonials.length < 2) {
        return { statusCode: 200, body: JSON.stringify({ pairs: [] }) }
    }

    const list = testimonials
        .map((t, i) =>
            `[${i}] ${t.name} | ${(t.conditions || []).join(', ') || 'none'} | ${t.excerpt}`
        )
        .join('\n')

    const prompt = `You are reviewing a list of health testimonials. Identify any pairs that are likely duplicates — the same person submitted the same story more than once, possibly with minor wording differences or different conditions listed.

Each entry is: [index] Name | Conditions | Story excerpt

${list}

Return ONLY a JSON array of duplicate pairs. Each pair must be an object with:
  "a": index of first testimonial
  "b": index of second testimonial
  "reason": one short sentence explaining why they look like duplicates

If there are no duplicates, return an empty array [].
Do not include any explanation, markdown, or code fences — only the raw JSON array.`

    try {
        console.log('Calling Anthropic API with', testimonials.length, 'testimonials')
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key':          apiKey,
                'anthropic-version':  '2023-06-01',
                'content-type':       'application/json',
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
            console.log('Anthropic error body:', JSON.stringify(errBody))
            const errType = errBody?.error?.type || ''

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

        const data  = await resp.json()
        const text  = data.content?.[0]?.text || '[]'

        let pairs
        try {
            pairs = JSON.parse(text)
        } catch {
            const match = text.match(/\[[\s\S]*\]/)
            pairs = match ? JSON.parse(match[0]) : []
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pairs }),
        }
    } catch (err) {
        console.log('Caught error:', err.message, err.stack)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        }
    }
}
