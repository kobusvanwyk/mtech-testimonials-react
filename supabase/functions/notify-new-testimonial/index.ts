const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const TO_EMAIL       = 'info@mtechtestimonials.co.za'
const FROM_EMAIL     = 'notifications@mtechtestimonials.co.za'
const SITE_URL       = 'https://mtechtestimonials.co.za'

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

    const html = `<!doctype html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <title>
      
    </title>
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--<![endif]-->
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
      #outlook a { padding:0; }
      body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
      p { display:block;margin:13px 0; }
    </style>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <!--[if lte mso 11]>
    <style type="text/css">
      .mj-outlook-group-fix { width:100% !important; }
    </style>
    <![endif]-->
    
    
    <style type="text/css">
      @media only screen and (min-width:480px) {
        .mj-column-per-100 { width:100% !important; max-width: 100%; }
      }
    </style>
    <style media="screen and (min-width:480px)">
      .moz-text-html .mj-column-per-100 { width:100% !important; max-width: 100%; }
    </style>
    
  
    <style type="text/css">
    
    
    </style>
    <style type="text/css">
    
    </style>
    
  </head>
  <body style="word-spacing:normal;background-color:#edf4f3;">
    
    
      <div
         style="background-color:#edf4f3;"
      >
        <!-- ── Header ── -->
      
      <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" bgcolor="#03B09F" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
    
      
      <div  style="background:#03B09F;background-color:#03B09F;margin:0px auto;border-radius:12px 12px 0 0;max-width:600px;">
        
        <table
           align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#03B09F;background-color:#03B09F;width:100%;border-radius:12px 12px 0 0;"
        >
          <tbody>
            <tr>
              <td
                 style="direction:ltr;font-size:0px;padding:36px 40px 28px 40px;text-align:center;"
              >
                <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:520px;" ><![endif]-->
            
      <div
         class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;"
      >
        
      <table
         border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%"
      >
        <tbody>
          
              <tr>
                <td
                   align="center" style="font-size:0px;padding:0 0 14px 0;word-break:break-word;"
                >
                  
      <div
         style="font-family:Arial, Helvetica, sans-serif;font-size:14px;line-height:1.6;text-align:center;color:#333333;"
      ><span style="display:inline-block;background-color:rgba(255,255,255,0.15);border-radius:20px;padding:5px 18px;font-size:11px;color:#ffffff;letter-spacing:2px;text-transform:uppercase;font-weight:700;">New Submission</span></div>
    
                </td>
              </tr>
            
              <tr>
                <td
                   align="center" style="font-size:0px;padding:0 0 6px 0;word-break:break-word;"
                >
                  
      <div
         style="font-family:Arial, Helvetica, sans-serif;font-size:24px;font-weight:700;line-height:1.3;text-align:center;color:#ffffff;"
      >A new testimonial has been submitted</div>
    
                </td>
              </tr>
            
              <tr>
                <td
                   align="center" style="font-size:0px;padding:0;word-break:break-word;"
                >
                  
      <div
         style="font-family:Arial, Helvetica, sans-serif;font-size:13px;line-height:1.6;text-align:center;color:rgba(255,255,255,0.8);"
      >${submittedAt}</div>
    
                </td>
              </tr>
            
        </tbody>
      </table>
    
      </div>
    
          <!--[if mso | IE]></td></tr></table><![endif]-->
              </td>
            </tr>
          </tbody>
        </table>
        
      </div>
    
      
      <!--[if mso | IE]></td></tr></table><![endif]-->
    
    <!-- ── Lime accent bar ── -->
      
      <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" bgcolor="#ACC42A" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
    
      
      <div  style="background:#ACC42A;background-color:#ACC42A;margin:0px auto;max-width:600px;">
        
        <table
           align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ACC42A;background-color:#ACC42A;width:100%;"
        >
          <tbody>
            <tr>
              <td
                 style="direction:ltr;font-size:0px;padding:0;text-align:center;"
              >
                <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:600px;" ><![endif]-->
            
      <div
         class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;"
      >
        
      <table
         border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%"
      >
        <tbody>
          
              <tr>
                <td
                   align="center" style="font-size:0px;padding:0;word-break:break-word;"
                >
                  
      <p
         style="border-top:solid 5px #ACC42A;font-size:1px;margin:0px auto;width:100%;"
      >
      </p>
      
      <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="border-top:solid 5px #ACC42A;font-size:1px;margin:0px auto;width:600px;" role="presentation" width="600px" ><tr><td style="height:0;line-height:0;"> &nbsp;
</td></tr></table><![endif]-->
    
    
                </td>
              </tr>
            
        </tbody>
      </table>
    
      </div>
    
          <!--[if mso | IE]></td></tr></table><![endif]-->
              </td>
            </tr>
          </tbody>
        </table>
        
      </div>
    
      
      <!--[if mso | IE]></td></tr></table><![endif]-->
    
    <!-- ── Body ── -->
      
      <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" bgcolor="#ffffff" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
    
      
      <div  style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
        
        <table
           align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;"
        >
          <tbody>
            <tr>
              <td
                 style="direction:ltr;font-size:0px;padding:36px 40px;text-align:center;"
              >
                <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:520px;" ><![endif]-->
            
      <div
         class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;"
      >
        
      <table
         border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%"
      >
        <tbody>
          <!-- Details table label -->
              <tr>
                <td
                   align="left" style="font-size:0px;padding:0 0 14px 0;word-break:break-word;"
                >
                  
      <div
         style="font-family:Arial, Helvetica, sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;line-height:1.6;text-align:left;text-transform:uppercase;color:#03B09F;"
      >Testimonial Details</div>
    
                </td>
              </tr>
            <!-- Title row -->
              <tr>
                <td
                   align="left" style="font-size:0px;padding:0 0 0 0;word-break:break-word;"
                >
                  
      <table
         cellpadding="0" cellspacing="0" width="100%" border="0" style="color:#000000;font-family:Arial, Helvetica, sans-serif;font-size:14px;line-height:22px;table-layout:auto;width:100%;border:none;"
      >
        <tr style="background-color:#f6fffe;">
            <td width="140" valign="top" style="padding:12px 14px;font-size:11px;font-weight:700;color:#666666;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e8f7f5;white-space:nowrap;">Title</td>
            <td valign="top" style="padding:12px 14px 12px 0;font-size:15px;font-weight:700;color:#1a1a2e;border-bottom:1px solid #e8f7f5;">${title}</td>
          </tr>
          <tr>
            <td width="140" valign="top" style="padding:12px 14px;font-size:11px;font-weight:700;color:#666666;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">Submitted By</td>
            <td valign="top" style="padding:12px 14px 12px 0;font-size:14px;color:#333333;border-bottom:1px solid #f0f0f0;">${name}</td>
          </tr>
          <tr style="background-color:#f6fffe;">
            <td width="140" valign="top" style="padding:12px 14px;font-size:11px;font-weight:700;color:#666666;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e8f7f5;white-space:nowrap;">Conditions</td>
            <td valign="top" style="padding:12px 14px 12px 0;font-size:14px;color:#333333;border-bottom:1px solid #e8f7f5;">${conditions}</td>
          </tr>
          <tr>
            <td width="140" valign="top" style="padding:12px 14px;font-size:11px;font-weight:700;color:#666666;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;">Products</td>
            <td valign="top" style="padding:12px 14px 12px 0;font-size:14px;color:#333333;">${products}</td>
          </tr>
      </table>
    
                </td>
              </tr>
            <!-- Story Preview label -->
              <tr>
                <td
                   align="left" style="font-size:0px;padding:28px 0 12px 0;word-break:break-word;"
                >
                  
      <div
         style="font-family:Arial, Helvetica, sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;line-height:1.6;text-align:left;text-transform:uppercase;color:#03B09F;"
      >Story Preview</div>
    
                </td>
              </tr>
            <!-- Story Preview blockquote -->
              <tr>
                <td
                   align="left" style="font-size:0px;padding:0 0 32px 0;word-break:break-word;"
                >
                  
      <table
         cellpadding="0" cellspacing="0" width="100%" border="0" style="color:#000000;font-family:Arial, Helvetica, sans-serif;font-size:13px;line-height:22px;table-layout:auto;width:100%;border:none;"
      >
        <tr>
            <td style="background-color:#f6fffe;border-left:4px solid #ACC42A;padding:18px 20px;font-size:14px;color:#444444;line-height:1.8;font-style:italic;">
              &ldquo;${preview}${hasMore ? '&hellip;' : ''}&rdquo;
            </td>
          </tr>
      </table>
    
                </td>
              </tr>
            <!-- CTA Button -->
              <tr>
                <td
                   align="left" vertical-align="middle" style="font-size:0px;padding:0;word-break:break-word;"
                >
                  
      <table
         border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;"
      >
        <tbody>
          <tr>
            <td
               align="center" bgcolor="#03B09F" role="presentation" style="border:none;border-radius:6px;cursor:auto;mso-padding-alt:14px 32px;background:#03B09F;" valign="middle"
            >
              <a
                 href="${SITE_URL}/admin/all" style="display:inline-block;background:#03B09F;color:#ffffff;font-family:Arial, Helvetica, sans-serif;font-size:15px;font-weight:700;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:14px 32px;mso-padding-alt:0px;border-radius:6px;" target="_blank"
              >
                Review in Admin &rarr;
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    
                </td>
              </tr>
            
        </tbody>
      </table>
    
      </div>
    
          <!--[if mso | IE]></td></tr></table><![endif]-->
              </td>
            </tr>
          </tbody>
        </table>
        
      </div>
    
      
      <!--[if mso | IE]></td></tr></table><![endif]-->
    
    <!-- ── Footer ── -->
      
      <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" bgcolor="#f8f9fa" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
    
      
      <div  style="background:#f8f9fa;background-color:#f8f9fa;margin:0px auto;border-radius:0 0 12px 12px;max-width:600px;">
        
        <table
           align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8f9fa;background-color:#f8f9fa;width:100%;border-radius:0 0 12px 12px;"
        >
          <tbody>
            <tr>
              <td
                 style="border-top:3px solid #ACC42A;direction:ltr;font-size:0px;padding:22px 40px;text-align:center;"
              >
                <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:520px;" ><![endif]-->
            
      <div
         class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;"
      >
        
      <table
         border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%"
      >
        <tbody>
          
              <tr>
                <td
                   align="center" style="font-size:0px;padding:0 0 6px 0;word-break:break-word;"
                >
                  
      <div
         style="font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:1.6;text-align:center;color:#aaaaaa;"
      >This is an automated notification from MTech Testimonials.</div>
    
                </td>
              </tr>
            
              <tr>
                <td
                   align="center" style="font-size:0px;padding:0;word-break:break-word;"
                >
                  
      <div
         style="font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:1.6;text-align:center;color:#333333;"
      ><a href="${SITE_URL}" style="color:#03B09F;text-decoration:none;font-weight:600;">mtechtestimonials.co.za</a></div>
    
                </td>
              </tr>
            
        </tbody>
      </table>
    
      </div>
    
          <!--[if mso | IE]></td></tr></table><![endif]-->
              </td>
            </tr>
          </tbody>
        </table>
        
      </div>
    
      
      <!--[if mso | IE]></td></tr></table><![endif]-->
    
    
      </div>
    
  </body>
</html>
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
