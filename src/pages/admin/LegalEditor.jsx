import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

const TABS = [
    { key: 'terms', label: '📄 Terms & Conditions' },
    { key: 'privacy', label: '🔒 Privacy Policy' },
]

const FALLBACK = {
    terms: `<h1>Terms &amp; Conditions for Testimonial Submission</h1>
<p><strong>Last Updated:</strong> February 28, 2026</p>
<h2>1. Acceptance of Terms</h2>
<p>By submitting a testimonial through this form, you agree to be bound by these Terms &amp; Conditions.</p>
<h2>2. Product Information Disclaimer</h2>
<p><strong>IMPORTANT:</strong> Mannatech products are nutritional supplements and are not intended to diagnose, treat, cure, or prevent any disease.</p>
<h2>3. Testimonial Content &amp; Ownership</h2>
<p>By submitting a testimonial, you confirm that the content represents your genuine personal experience. You grant Mtech Testimonials a perpetual, worldwide, royalty-free licence to use, reproduce, modify, and publish your testimonial.</p>
<h2>4. Anonymous Submissions</h2>
<p>If you choose to submit anonymously, your name will not be publicly displayed. Your identity will be retained internally for verification purposes.</p>
<h2>5. Content Guidelines</h2>
<p>Submitted testimonials must not make false or misleading statements, claim products cure diseases, or contain offensive content.</p>
<h2>6. Editorial Rights</h2>
<p>Mtech Testimonials reserves the right to review, approve, edit, or reject any testimonial at our sole discretion.</p>
<h2>7. Public Nature of Published Testimonials</h2>
<p><strong>Important:</strong> Once published, your testimonial including your name (unless anonymous), health conditions, and story will be publicly visible.</p>
<h2>8. No Medical Advice</h2>
<p>Testimonials represent individual experiences only. Always consult with a qualified healthcare provider before starting any new supplement regimen.</p>
<h2>9. Governing Law</h2>
<p>These Terms shall be governed by the laws of South Africa.</p>
<h2>10. Contact Information</h2>
<p>Email: <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a></p>`,

    privacy: `<h1>Privacy Policy</h1>
<p><strong>Last Updated:</strong> February 28, 2026</p>
<h2>Introduction</h2>
<p>Mtech Testimonials is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal data.</p>
<h2>1. Information We Collect</h2>
<p>When you submit a testimonial, we collect your name (or "Anonymous"), health conditions mentioned, products used, your written story, photos, and technical data such as IP address and submission timestamp.</p>
<h2>2. How We Use Your Information</h2>
<ul><li>To review and publish your testimonial</li><li>To contact you if clarification is needed</li><li>To categorise content by health conditions and products</li><li>To prevent spam and fraudulent submissions</li></ul>
<h2>3. Public Disclosure</h2>
<p><strong>Important:</strong> Published testimonials are PUBLIC. Your name (unless anonymous), health conditions, and testimonial content will be visible to anyone who visits our website.</p>
<h2>4. We Do NOT</h2>
<ul><li>Sell your personal data to third parties</li><li>Share your data for third-party marketing purposes</li></ul>
<h2>5. Your Rights (POPIA &amp; GDPR)</h2>
<ul><li><strong>Right to Access</strong> your stored data</li><li><strong>Right to Rectification</strong> of inaccurate data</li><li><strong>Right to Erasure</strong> of unpublished submissions</li><li><strong>Right to Withdraw Consent</strong> at any time</li></ul>
<p>Contact: <a href="mailto:info@mtechtestimonials.co.za">info@mtechtestimonials.co.za</a></p>
<h2>6. Data Retention</h2>
<ul><li>Published testimonials: retained indefinitely unless removal is requested</li><li>Unpublished/rejected submissions: up to 1 year</li><li>IP addresses and logs: up to 90 days</li></ul>
<h2>7. POPIA Complaints</h2>
<p>You may lodge a complaint with the Information Regulator of South Africa at <a href="mailto:inforeg@justice.gov.za">inforeg@justice.gov.za</a></p>
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

    const quillRef = useRef(null)
    const quillInstance = useRef(null)
    const contentRef = useRef({ terms: '', privacy: '' })

    // Fetch from Supabase on mount
    useEffect(() => {
        async function fetchContent() {
            const { data } = await supabase
                .from('site_content')
                .select('key, content')
                .in('key', ['terms', 'privacy'])
            const fetched = { terms: FALLBACK.terms, privacy: FALLBACK.privacy }
            if (data) data.forEach(row => { fetched[row.key] = row.content })
            setContent(fetched)
            contentRef.current = fetched
            setLoading(false)
        }
        fetchContent()
    }, [])

    // Init Quill once content is loaded
    useEffect(() => {
        if (loading || preview || quillInstance.current) return
        if (!quillRef.current) return

        const q = new Quill(quillRef.current, {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link'],
                    ['clean'],
                ],
            },
        })

        q.root.innerHTML = contentRef.current[activeTab]

        q.on('text-change', () => {
            const html = q.root.innerHTML
            contentRef.current[activeTab] = html
            setContent(prev => ({ ...prev, [activeTab]: html }))
            setSaved(false)
        })

        quillInstance.current = q
    }, [loading, preview])

    // When tab changes, flush current content then reload editor
    function handleTabChange(key) {
        if (quillInstance.current) {
            contentRef.current[activeTab] = quillInstance.current.root.innerHTML
            setContent(prev => ({ ...prev, [activeTab]: quillInstance.current.root.innerHTML }))
            quillInstance.current.off('text-change')
            quillInstance.current = null
        }
        setActiveTab(key)
        setPreview(false)
        setSaved(false)
    }

    // Re-init quill after tab change
    useEffect(() => {
        if (loading || preview) return
        if (quillInstance.current || !quillRef.current) return

        const q = new Quill(quillRef.current, {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link'],
                    ['clean'],
                ],
            },
        })

        q.root.innerHTML = contentRef.current[activeTab]

        q.on('text-change', () => {
            const html = q.root.innerHTML
            contentRef.current[activeTab] = html
            setContent(prev => ({ ...prev, [activeTab]: html }))
            setSaved(false)
        })

        quillInstance.current = q
    }, [activeTab, preview, loading])

    // Toggle preview: flush editor content first
    function handlePreviewToggle() {
        if (!preview && quillInstance.current) {
            contentRef.current[activeTab] = quillInstance.current.root.innerHTML
            setContent(prev => ({ ...prev, [activeTab]: quillInstance.current.root.innerHTML }))
            quillInstance.current.off('text-change')
            quillInstance.current = null
        }
        setPreview(p => !p)
    }

    async function handleSave() {
        // Flush latest from editor
        const currentHtml = quillInstance.current
            ? quillInstance.current.root.innerHTML
            : contentRef.current[activeTab]

        setSaving(true)
        try {
            const { error } = await supabase
                .from('site_content')
                .upsert(
                    { key: activeTab, content: currentHtml, updated_at: new Date().toISOString() },
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

    if (loading) return <div className="admin-page-content"><div className="loading">Loading...</div></div>

    return (
        <div className="admin-page-content">
            <div className="edit-header">
                <h2>📝 Legal Pages</h2>
                <div className="edit-header-actions">
                    <button
                        className={`btn-preview ${preview ? 'active' : ''}`}
                        onClick={handlePreviewToggle}
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
                        onClick={() => handleTabChange(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="legal-editor-wrap">
                {preview ? (
                    <div
                        className="legal-preview-pane legal-content"
                        dangerouslySetInnerHTML={{ __html: contentRef.current[activeTab] }}
                    />
                ) : (
                    <div ref={quillRef} />
                )}
            </div>

            <div className="edit-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <p className="legal-editor-hint">
                    Changes go live on the public site immediately after saving.
                </p>
                <button className="btn-save" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </button>
            </div>
        </div>
    )
}
