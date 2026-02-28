import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const TABS = [
    { key: 'terms', label: '📄 Terms & Conditions' },
    { key: 'privacy', label: '🔒 Privacy Policy' },
]

const QUILL_MODULES = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean'],
    ],
}

const QUILL_FORMATS = [
    'header', 'bold', 'italic', 'underline',
    'list', 'bullet', 'link',
]

// Static fallback content (matches current JSX pages)
const FALLBACK = {
    terms: `<h1>Terms &amp; Conditions for Testimonial Submission</h1>
<p><strong>Last Updated:</strong> February 28, 2026</p>
<h2>1. Acceptance of Terms</h2>
<p>By submitting a testimonial through this form, you agree to be bound by these Terms &amp; Conditions. If you do not agree to these terms, please do not submit a testimonial.</p>
<h2>2. Product Information Disclaimer</h2>
<p><strong>IMPORTANT:</strong> Mannatech products are nutritional supplements and are not intended to diagnose, treat, cure, or prevent any disease. By law, no guarantee can be given that these products will cure any medical condition.</p>
<h2>3. Testimonial Submission</h2>
<h3>3.1 Content Ownership</h3>
<p>By submitting a testimonial, you grant Mtech Testimonials a perpetual, worldwide, royalty-free, non-exclusive license to use, reproduce, modify, and publish your testimonial on websites, marketing materials, and social media.</p>
<h3>3.2 Anonymous Submissions</h3>
<p>If you choose to submit anonymously, your name will not be publicly displayed but your identity will be retained internally for verification purposes.</p>
<h2>4. Content Guidelines</h2>
<p>Your testimonial must represent your genuine personal experience and must not make false or misleading statements, claim products cure or treat specific diseases, or include offensive or inappropriate content.</p>
<h2>5. Editorial Rights</h2>
<p>Mtech Testimonials reserves the right to review, edit, reject, or remove any testimonial at any time. Submission does not guarantee publication.</p>
<h2>6. No Medical Advice</h2>
<p>Testimonials are personal experiences only and do not constitute medical advice. Always consult with a qualified healthcare provider before starting any supplement regimen.</p>
<h2>7. Governing Law</h2>
<p>These Terms &amp; Conditions shall be governed by the laws of South Africa.</p>
<h2>8. Contact Information</h2>
<p>Email: <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a></p>`,

    privacy: `<h1>Privacy Policy</h1>
<p><strong>Last Updated:</strong> February 28, 2026</p>
<h2>Introduction</h2>
<p>Mtech Testimonials is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal data when you submit a testimonial.</p>
<h2>1. Information We Collect</h2>
<p>When you submit a testimonial, we collect your name (or "Anonymous"), health conditions mentioned, Mannatech products used, your written story, photos (up to 8), and technical data such as IP address and submission timestamp.</p>
<h2>2. How We Use Your Information</h2>
<ul><li>Review and publish your testimonial</li><li>Contact you if clarification is needed</li><li>Categorize content by health conditions and products</li><li>Prevent spam and fraudulent submissions</li></ul>
<h2>3. Public Disclosure</h2>
<p><strong>Important:</strong> Published testimonials are PUBLIC. Your name (unless anonymous), health conditions, and testimonial content will be visible to anyone who visits our website.</p>
<h2>4. We Do NOT</h2>
<ul><li>Sell your personal data to third parties</li><li>Share your data for third-party marketing purposes</li></ul>
<h2>5. Your Rights (POPIA &amp; GDPR)</h2>
<ul><li>Right to Access your data</li><li>Right to Rectification</li><li>Right to Erasure of unpublished submissions</li><li>Right to Withdraw Consent at any time</li></ul>
<p>To exercise these rights: <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a></p>
<h2>6. Data Retention</h2>
<ul><li>Published testimonials: retained indefinitely unless removal is requested</li><li>Unpublished/rejected submissions: up to 1 year</li><li>IP addresses and logs: up to 90 days</li></ul>
<h2>7. POPIA Complaints</h2>
<p>You may lodge a complaint with the Information Regulator South Africa at <a href="mailto:inforeg@justice.gov.za">inforeg@justice.gov.za</a></p>
<h2>8. Contact</h2>
<p>Email: <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a></p>`,
}

export default function LegalEditor() {
    const [activeTab, setActiveTab] = useState('terms')
    const [content, setContent] = useState({ terms: '', privacy: '' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [preview, setPreview] = useState(false)

    useEffect(() => { fetchContent() }, [])

    async function fetchContent() {
        const { data } = await supabase
            .from('site_content')
            .select('key, content')
            .in('key', ['terms', 'privacy'])

        const fetched = { terms: FALLBACK.terms, privacy: FALLBACK.privacy }
        if (data) {
            data.forEach(row => { fetched[row.key] = row.content })
        }
        setContent(fetched)
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('site_content')
                .upsert(
                    { key: activeTab, content: content[activeTab], updated_at: new Date().toISOString() },
                    { onConflict: 'key' }
                )
            if (error) throw error
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            alert('Error saving. Please try again.')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    function handleChange(val) {
        setContent(prev => ({ ...prev, [activeTab]: val }))
        setSaved(false)
    }

    if (loading) return <div className="admin-page-content"><div className="loading">Loading...</div></div>

    return (
        <div className="admin-page-content">
            <div className="edit-header">
                <h2>📝 Legal Pages</h2>
                <div className="edit-header-actions">
                    <button
                        className={`btn-preview ${preview ? 'active' : ''}`}
                        onClick={() => setPreview(p => !p)}
                    >
                        {preview ? '✎ Edit' : '👁 Preview'}
                    </button>
                    <button className="btn-save" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="legal-editor-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`legal-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => { setActiveTab(tab.key); setPreview(false) }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="legal-editor-wrap">
                {preview ? (
                    <div
                        className="legal-preview-pane legal-page-preview"
                        dangerouslySetInnerHTML={{ __html: content[activeTab] }}
                    />
                ) : (
                    <ReactQuill
                        value={content[activeTab]}
                        onChange={handleChange}
                        modules={QUILL_MODULES}
                        formats={QUILL_FORMATS}
                        className="legal-quill-editor"
                        theme="snow"
                    />
                )}
            </div>

            <div className="edit-footer">
                <p className="legal-editor-hint">
                    Changes are saved to the database and appear live on the public site immediately after saving.
                </p>
                <button className="btn-save" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </button>
            </div>
        </div>
    )
}
