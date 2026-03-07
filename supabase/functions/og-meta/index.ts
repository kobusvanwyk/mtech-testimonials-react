// og-meta: Serves OG meta tags for social crawlers on testimonial pages.
// Deploy and configure your hosting to route /testimonial/* bot traffic here.

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!

// Known social/bot crawlers that need server-rendered OG tags
const BOT_PATTERNS = [
    'whatsapp', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'slackbot', 'telegrambot', 'discordbot', 'googlebot', 'bingbot',
    'applebot', 'ia_archiver', 'embedly', 'outbrain', 'pinterest',
]

function isBot(userAgent: string): boolean {
    const ua = userAgent.toLowerCase()
    return BOT_PATTERNS.some(bot => ua.includes(bot))
}

function truncate(text: string, max: number): string {
    if (!text) return ''
    return text.length <= max ? text : text.slice(0, max - 1) + '…'
}

async function getSettings(): Promise<Record<string, string>> {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/site_settings?select=key,value`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    )
    const rows: { key: string; value: string }[] = await res.json()
    const map: Record<string, string> = {}
    rows.forEach(r => { map[r.key] = r.value })
    return map
}

async function getTestimonial(slug: string): Promise<Record<string, string> | null> {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/testimonials?slug=eq.${encodeURIComponent(slug)}&status=eq.approved&select=title,story_text,person_name,anonymous&limit=1`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    )
    const rows = await res.json()
    return rows?.[0] ?? null
}

Deno.serve(async (req: Request) => {
    const url = new URL(req.url)
    const ua  = req.headers.get('user-agent') ?? ''

    // Only serve OG HTML to bots — real users shouldn't hit this function
    if (!isBot(ua)) {
        return new Response('Not a bot', { status: 200 })
    }

    // Extract slug from path: /og-meta?slug=some-slug  OR  /og-meta/some-slug
    const slug = url.searchParams.get('slug') ?? url.pathname.split('/').filter(Boolean).pop() ?? ''

    const [settings, testimonial] = await Promise.all([
        getSettings(),
        slug ? getTestimonial(slug) : Promise.resolve(null),
    ])

    const siteUrl   = settings.og_url        || 'https://mtechtestimonials.co.za'
    const siteName  = settings.og_site_name  || 'Mannatech Testimonials Database'
    const ogImage   = settings.og_image_url  || `${siteUrl}/og-image.png`
    const siteTitle = settings.og_title      || siteName
    const siteDesc  = settings.og_description || ''

    let pageTitle = siteTitle
    let pageDesc  = siteDesc
    let pageUrl   = siteUrl

    if (testimonial) {
        const name = testimonial.anonymous ? '' : (testimonial.person_name ? ` — ${testimonial.person_name}` : '')
        pageTitle = `${testimonial.title}${name} | ${siteName}`
        pageDesc  = truncate(testimonial.story_text, 160)
        pageUrl   = `${siteUrl}/testimonial/${slug}`
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}" />
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="${siteName}" />
  <meta property="og:url"         content="${pageUrl}" />
  <meta property="og:title"       content="${pageTitle}" />
  <meta property="og:description" content="${pageDesc}" />
  <meta property="og:image"       content="${ogImage}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${pageTitle}" />
  <meta name="twitter:description" content="${pageDesc}" />
  <meta name="twitter:image"       content="${ogImage}" />
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <p>Redirecting… <a href="${pageUrl}">${pageTitle}</a></p>
</body>
</html>`

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
})
