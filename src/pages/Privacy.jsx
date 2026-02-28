import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STATIC_CONTENT = `<h1>Privacy Policy</h1>
<p><strong>Last Updated:</strong> February 28, 2026</p>
<h2>Introduction</h2>
<p>Mtech Testimonials is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal data when you submit a testimonial.</p>
<h2>1. Information We Collect</h2>
<p>When you submit a testimonial, we collect your name (or "Anonymous" if you choose), health conditions mentioned, Mannatech products used, your written story, photos (up to 8), and technical data such as IP address and submission timestamp.</p>
<h2>2. How We Use Your Information</h2>
<ul>
  <li>To review and publish your testimonial</li>
  <li>To contact you if clarification is needed</li>
  <li>To categorise content by health conditions and products</li>
  <li>To prevent spam and fraudulent submissions</li>
</ul>
<h2>3. Public Disclosure</h2>
<p><strong>Important:</strong> Published testimonials are PUBLIC. Your name (unless anonymous), health conditions, and testimonial content will be visible to anyone who visits our website and may be shared on social media.</p>
<h2>4. Sharing Your Data</h2>
<p>We do NOT sell your personal data to third parties or share your data for third-party marketing purposes. We may share data with service providers (Supabase for database, Vercel for hosting) strictly for operating this service.</p>
<h2>5. Your Rights (POPIA &amp; GDPR)</h2>
<ul>
  <li><strong>Right to Access</strong> — request a copy of your stored data</li>
  <li><strong>Right to Rectification</strong> — request correction of inaccurate data</li>
  <li><strong>Right to Erasure</strong> — request removal of unpublished submissions</li>
  <li><strong>Right to Object</strong> — object to specific uses of your data</li>
  <li><strong>Right to Withdraw Consent</strong> — at any time, without affecting prior processing</li>
</ul>
<p>To exercise any of these rights, contact: <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a></p>
<h2>6. Data Retention</h2>
<ul>
  <li><strong>Published testimonials:</strong> retained indefinitely unless removal is requested</li>
  <li><strong>Unpublished/rejected submissions:</strong> up to 1 year</li>
  <li><strong>IP addresses and technical logs:</strong> up to 90 days</li>
</ul>
<h2>7. Security</h2>
<p>We use industry-standard security measures including encrypted connections (HTTPS) and row-level security on our database. No method of transmission over the internet is 100% secure.</p>
<h2>8. Children's Privacy</h2>
<p>This service is not directed to children under 13. We do not knowingly collect personal information from children under 13 without parental consent.</p>
<h2>9. POPIA Complaints</h2>
<p>You may lodge a complaint with the Information Regulator of South Africa:<br>
Website: <a href="https://www.justice.gov.za/inforeg/" target="_blank" rel="noopener">www.justice.gov.za/inforeg</a><br>
Email: <a href="mailto:inforeg@justice.gov.za">inforeg@justice.gov.za</a></p>
<h2>10. Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. Continued use of our submission form constitutes acceptance of any updates.</p>
<h2>11. Contact</h2>
<p>Email: <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a></p>`

export default function Privacy() {
    const [html, setHtml] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const { data } = await supabase
                    .from('site_content')
                    .select('content')
                    .eq('key', 'privacy')
                    .single()
                setHtml(data?.content || STATIC_CONTENT)
            } catch {
                setHtml(STATIC_CONTENT)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    return (
        <div className="legal-page">
            <div className="legal-container">
                {loading
                    ? <div className="loading">Loading...</div>
                    : <div className="legal-content" dangerouslySetInnerHTML={{ __html: html }} />
                }
            </div>
        </div>
    )
}
