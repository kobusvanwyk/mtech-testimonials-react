// Netlify Edge Function — runs on every /testimonial/* request.
// Bots get OG meta HTML from Supabase. Real users get the React app normally.

const BOT_PATTERNS = [
    'whatsapp', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'slackbot', 'telegrambot', 'discordbot', 'googlebot', 'bingbot',
    'applebot', 'ia_archiver', 'embedly', 'outbrain', 'pinterest',
]

export default async function handler(request, context) {
    const ua = request.headers.get('user-agent') ?? ''
    const isBot = BOT_PATTERNS.some(bot => ua.toLowerCase().includes(bot))

    // Real user — serve the React app as normal
    if (!isBot) return context.next()

    // Bot — extract slug from URL path: /testimonial/some-slug
    const slug = new URL(request.url).pathname.split('/').filter(Boolean).pop() ?? ''

    // Forward to Supabase og-meta edge function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const ogUrl = `${supabaseUrl}/functions/v1/og-meta?slug=${encodeURIComponent(slug)}`

    try {
        const res = await fetch(ogUrl, {
            headers: { 'user-agent': ua }
        })
        const html = await res.text()
        return new Response(html, {
            headers: { 'content-type': 'text/html; charset=utf-8' }
        })
    } catch {
        // If edge function fails, fall through to React app
        return context.next()
    }
}
