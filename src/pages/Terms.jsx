import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STATIC_CONTENT = `<h1>Terms &amp; Conditions for Testimonial Submission</h1>
<p><strong>Last Updated:</strong> February 28, 2026</p>
<h2>1. Acceptance of Terms</h2>
<p>By submitting a testimonial through this form, you agree to be bound by these Terms &amp; Conditions. If you do not agree to these terms, please do not submit a testimonial.</p>
<h2>2. Product Information Disclaimer</h2>
<p><strong>IMPORTANT:</strong> Mannatech products are nutritional supplements and are not intended to diagnose, treat, cure, or prevent any disease. By law, no guarantee can be given that these products will cure any medical condition.</p>
<h2>3. Testimonial Content &amp; Ownership</h2>
<p>By submitting a testimonial, you confirm that the content represents your genuine personal experience. You grant Mtech Testimonials a perpetual, worldwide, royalty-free licence to use, reproduce, modify, and publish your testimonial.</p>
<h2>4. Anonymous Submissions</h2>
<p>If you choose to submit anonymously, your name will not be publicly displayed. However, your identity will be retained internally for verification and fraud prevention purposes.</p>
<h2>5. Content Guidelines</h2>
<p>Submitted testimonials must not make false or misleading statements, claim that products diagnose, treat, cure, or prevent any disease, contain offensive content, or be submitted on behalf of another person without their consent.</p>
<h2>6. Editorial Rights</h2>
<p>Mtech Testimonials reserves the right to review, approve, edit, or reject any testimonial at our sole discretion. Submission does not guarantee publication.</p>
<h2>7. Public Nature of Published Testimonials</h2>
<p><strong>Important:</strong> Once approved and published, your testimonial including your name (unless anonymous), health conditions, and story will be publicly visible on our website.</p>
<h2>8. No Medical Advice</h2>
<p>Testimonials represent individual experiences and results may vary. Nothing in any testimonial should be construed as medical advice. Always consult with a qualified healthcare provider before starting any new supplement regimen.</p>
<h2>9. Right to Withdraw</h2>
<p>You may request removal of your testimonial at any time by contacting us.</p>
<h2>10. Governing Law</h2>
<p>These Terms &amp; Conditions shall be governed by and construed in accordance with the laws of South Africa.</p>
<h2>11. Contact Information</h2>
<p>For any questions, please contact us at <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a>.</p>`

export default function Terms() {
    const [html, setHtml] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const { data } = await supabase
                    .from('site_content')
                    .select('content')
                    .eq('key', 'terms')
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
