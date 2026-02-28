import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

const TABS = [
    { key: 'terms', label: '📄 Terms & Conditions' },
    { key: 'privacy', label: '🔒 Privacy Policy' },
]

const TOOLBAR = [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
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
<p><strong>Important:</strong> Published testimonials are PUBLIC. Your name (unless anonymous), health conditions, and content will be visible to anyone who visits our website.</p>
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
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [mode, setMode] = useState('edit') // 'edit' | 'html' | 'preview'
    const [previewHtml, setPreviewHtml] = useState('')
    const [htmlSource, setHtmlSource] = useState('')

    // Single source of truth for all content — plain object, not state
    const contentRef = useRef({ terms: FALLBACK.terms, privacy: FALLBACK.privacy })
    const quillContainerRef = useRef(null)
    const quillRef = useRef(null)

    // Load from Supabase once
    useEffect(() => {
        async function fetchContent() {
            try {
                const { data } = await supabase
                    .from('site_content')
                    .select('key, content')
                    .in('key', ['terms', 'privacy'])
                if (data) data.forEach(row => { contentRef.current[row.key] = row.content })
            } catch (e) { /* use fallback */ }
            setLoading(false)
        }
        fetchContent()
    }, [])

    // Mount / remount Quill whenever tab changes or returning to edit mode
    useEffect(() => {
        if (loading || mode !== 'edit') return

        // Destroy any existing instance first
        if (quillRef.current) {
            quillRef.current = null
        }
        if (!quillContainerRef.current) return

        // Clear the container so Quill gets a fresh DOM node
        quillContainerRef.current.innerHTML = ''

        const editorDiv = document.createElement('div')
        quillContainerRef.current.appendChild(editorDiv)

        const q = new Quill(editorDiv, {
            theme: 'snow',
            modules: { toolbar: TOOLBAR },
        })

        q.root.innerHTML = contentRef.current[activeTab]
        quillRef.current = q

        q.on('text-change', () => {
            contentRef.current[activeTab] = q.root.innerHTML
        })

        // Cleanup: just null the ref, DOM cleanup happens via innerHTML = '' above
        return () => {
            quillRef.current = null
        }
    }, [activeTab, mode, loading])

    function handleTabChange(key) {
        if (key === activeTab) return
        // Flush current editor content before switching
        if (quillRef.current) {
            contentRef.current[activeTab] = quillRef.current.root.innerHTML
            quillRef.current = null
        }
        if (mode === 'html') {
            contentRef.current[activeTab] = htmlSource
        }
        setMode('edit')
        setSaved(false)
        setActiveTab(key)
    }

    function handleModeChange(newMode) {
        if (newMode === mode) return

        // Flush content out of whatever mode we're leaving
        if (mode === 'edit' && quillRef.current) {
            contentRef.current[activeTab] = quillRef.current.root.innerHTML
            quillRef.current = null
        }
        if (mode === 'html') {
            contentRef.current[activeTab] = htmlSource
        }

        // Prep the incoming mode
        if (newMode === 'html') {
            setHtmlSource(contentRef.current[activeTab])
        }
        if (newMode === 'preview') {
            setPreviewHtml(contentRef.current[activeTab])
        }

        setSaved(false)
        setMode(newMode)
    }

    async function handleSave() {
        const html = mode === 'edit' && quillRef.current
            ? quillRef.current.root.innerHTML
            : mode === 'html'
            ? htmlSource
            : contentRef.current[activeTab]

        setSaving(true)
        try {
            const { error } = await supabase
                .from('site_content')
                .upsert(
                    { key: activeTab, content: html, updated_at: new Date().toISOString() },
                    { onConflict: 'key' }
                )
            if (error) throw error
            contentRef.current[activeTab] = html
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
                    <div className="mode-toggle-group">
                        <button
                            className={`mode-toggle-btn ${mode === 'edit' ? 'active' : ''}`}
                            onClick={() => handleModeChange('edit')}
                        >✎ Edit</button>
                        <button
                            className={`mode-toggle-btn ${mode === 'html' ? 'active' : ''}`}
                            onClick={() => handleModeChange('html')}
                        >{'</>'} HTML</button>
                        <button
                            className={`mode-toggle-btn ${mode === 'preview' ? 'active' : ''}`}
                            onClick={() => handleModeChange('preview')}
                        >👁 Preview</button>
                    </div>
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
                {mode === 'preview' && (
                    <div
                        className="legal-preview-pane legal-content"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                )}
                {mode === 'html' && (
                    <textarea
                        className="legal-html-source"
                        value={htmlSource}
                        onChange={e => { setHtmlSource(e.target.value); setSaved(false) }}
                        spellCheck={false}
                    />
                )}
                {mode === 'edit' && (
                    <div ref={quillContainerRef} className="quill-mount-point" />
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
