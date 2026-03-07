const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const TO_EMAIL = 'info@mtechtestimonials.co.za'
const FROM_EMAIL = 'notifications@mtechtestimonials.co.za'

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()

    // Supabase DB webhooks send { type, table, record, old_record }
    const record = payload.record ?? payload

    const title      = record.title       ?? '(no title)'
    const name       = record.anonymous   ? 'Anonymous' : (record.person_name ?? 'Unknown')
    const conditions = (record.conditions ?? []).join(', ') || 'None listed'
    const products   = (record.products   ?? []).join(', ') || 'None listed'
    const preview    = (record.story_text ?? '').slice(0, 300)
    const submittedAt = record.created_at
      ? new Date(record.created_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
      : new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
        <div style="background: #7CC42A; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 1.3rem;">New Testimonial Submitted</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 0.9rem;">${submittedAt}</p>
        </div>

        <div style="background: white; padding: 28px 32px; border: 1px solid #e0e0e0; border-top: none;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 0.85rem; width: 130px;">Title</td>
              <td style="padding: 8px 0; font-weight: 600; color: #1a1a2e;">${title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 0.85rem;">Submitted by</td>
              <td style="padding: 8px 0; color: #1a1a2e;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 0.85rem;">Conditions</td>
              <td style="padding: 8px 0; color: #1a1a2e;">${conditions}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 0.85rem;">Products</td>
              <td style="padding: 8px 0; color: #1a1a2e;">${products}</td>
            </tr>
          </table>

          <div style="background: #f8f9fa; border-left: 4px solid #7CC42A; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 0.88rem; color: #444; line-height: 1.6;">
              ${preview}${(record.story_text ?? '').length > 300 ? '…' : ''}
            </p>
          </div>

          <a href="https://mtechtestimonials.co.za/admin/pending"
             style="display: inline-block; background: #7CC42A; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.95rem;">
            Review in Admin →
          </a>
        </div>

        <div style="background: #f8f9fa; padding: 16px 32px; border: 1px solid #e0e0e0; border-top: none;
                    border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; font-size: 0.78rem; color: #999;">
            This is an automated notification from Mtech Testimonials.
          </p>
        </div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Mtech Testimonials <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        subject: `New testimonial: "${title}"`,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend error:', data)
      return new Response(JSON.stringify({ error: data }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), { status: 200 })

  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
