const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const TO_EMAIL       = 'info@mtechtestimonials.co.za'
const FROM_EMAIL     = 'notifications@mtechtestimonials.co.za'
const SITE_URL       = 'https://mtechtestimonials.co.za'
const LOGO_URL       = `${SITE_URL}/web-app-manifest-512x512.png`

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const record  = payload.record ?? payload

    const title      = record.title       ?? '(no title)'
    const name       = record.anonymous   ? 'Anonymous' : (record.person_name ?? 'Unknown')
    const conditions = (record.conditions ?? []).join(', ') || 'None listed'
    const products   = (record.products   ?? []).join(', ') || 'None listed'
    const preview    = (record.story_text ?? '').slice(0, 300)
    const hasMore    = (record.story_text ?? '').length > 300
    const submittedAt = record.created_at
      ? new Date(record.created_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
      : new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })

    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Testimonial Submitted</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background-color:#03B09F;border-radius:10px 10px 0 0;padding:28px 40px;text-align:center;">
            <img src="${LOGO_URL}" alt="MTech Testimonials" width="72" height="72"
                 style="display:block;margin:0 auto 14px auto;border-radius:12px;border:0;" />
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:1.5px;text-transform:uppercase;">MTech Testimonials</p>
            <h1 style="margin:6px 0 0 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">New Testimonial Submitted</h1>
            <p style="margin:8px 0 0 0;font-size:13px;color:rgba(255,255,255,0.8);">${submittedAt}</p>
          </td>
        </tr>

        <!-- Lime accent bar -->
        <tr>
          <td style="background-color:#ACC42A;height:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background-color:#ffffff;padding:32px 40px;">

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:24px;">
              <tr>
                <td width="130" valign="top" style="padding:10px 12px 10px 0;font-size:12px;color:#888888;border-bottom:1px solid #f0f0f0;white-space:nowrap;">TITLE</td>
                <td valign="top" style="padding:10px 0;font-size:15px;font-weight:700;color:#1a1a2e;border-bottom:1px solid #f0f0f0;">${title}</td>
              </tr>
              <tr>
                <td width="130" valign="top" style="padding:10px 12px 10px 0;font-size:12px;color:#888888;border-bottom:1px solid #f0f0f0;white-space:nowrap;">SUBMITTED BY</td>
                <td valign="top" style="padding:10px 0;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f0f0;">${name}</td>
              </tr>
              <tr>
                <td width="130" valign="top" style="padding:10px 12px 10px 0;font-size:12px;color:#888888;border-bottom:1px solid #f0f0f0;white-space:nowrap;">CONDITIONS</td>
                <td valign="top" style="padding:10px 0;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f0f0;">${conditions}</td>
              </tr>
              <tr>
                <td width="130" valign="top" style="padding:10px 12px 10px 0;font-size:12px;color:#888888;white-space:nowrap;">PRODUCTS</td>
                <td valign="top" style="padding:10px 0;font-size:14px;color:#1a1a2e;">${products}</td>
              </tr>
            </table>

            <!-- Story preview label -->
            <p style="margin:0 0 10px 0;font-size:12px;color:#888888;letter-spacing:1px;text-transform:uppercase;">Story Preview</p>

            <!-- Story preview block -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
              <tr>
                <td style="background-color:#f6fffe;border-left:4px solid #03B09F;border-radius:0 6px 6px 0;padding:16px 18px;">
                  <p style="margin:0;font-size:14px;color:#444444;line-height:1.7;font-style:italic;">&ldquo;${preview}${hasMore ? '&hellip;' : ''}&rdquo;</p>
                </td>
              </tr>
            </table>

            <!-- CTA button — VML for Outlook, regular anchor for others -->
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
              href="${SITE_URL}/admin/all"
              style="height:44px;v-text-anchor:middle;width:200px;"
              arcsize="14%" fillcolor="#03B09F" strokecolor="#03B09F">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Review in Admin &rarr;</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${SITE_URL}/admin/all"
               style="display:inline-block;background-color:#03B09F;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:6px;">
              Review in Admin &rarr;
            </a>
            <!--<![endif]-->

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8f9fa;border-radius:0 0 10px 10px;border-top:1px solid #e8e8e8;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 6px 0;font-size:12px;color:#aaaaaa;">This is an automated notification from MTech Testimonials.</p>
            <p style="margin:0;font-size:12px;color:#aaaaaa;">
              <a href="${SITE_URL}" style="color:#03B09F;text-decoration:none;">mtechtestimonials.co.za</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

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
