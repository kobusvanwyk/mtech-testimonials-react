import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { FileText, Save, Check, ExternalLink } from 'lucide-react'

const PDF_FIELDS = [
    {
        key: 'pdf_logo_url',
        label: 'Logo URL',
        hint: 'URL of the Mannatech logo to show in the top-right corner of every PDF. Upload via Image Manager and paste the public URL here.',
        type: 'url',
    },
    {
        key: 'pdf_contact_name',
        label: 'Your Name',
        hint: 'Your name as it appears in the PDF footer (e.g. Jane Smith).',
        type: 'text',
    },
    {
        key: 'pdf_contact_phone',
        label: 'Phone Number',
        hint: 'Phone number shown in the PDF footer.',
        type: 'text',
    },
    {
        key: 'pdf_contact_email',
        label: 'Email Address',
        hint: 'Email address shown in the PDF footer.',
        type: 'email',
    },
    {
        key: 'pdf_contact_whatsapp',
        label: 'WhatsApp Number',
        hint: 'WhatsApp number shown in the PDF footer.',
        type: 'text',
    },
    {
        key: 'pdf_footer_tagline',
        label: 'Footer Tagline',
        hint: 'A short line shown below the contact details (e.g. Mannatech – Transforming Lives Naturally).',
        type: 'text',
    },
]

export default function PDFSettings() {
    const [values, setValues]   = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState(false)
    const [saved, setSaved]     = useState(false)
    const [error, setError]     = useState(null)

    useEffect(() => { loadSettings() }, [])

    async function loadSettings() {
        const { data, error } = await supabase
            .from('site_settings')
            .select('key, value')
            .in('key', PDF_FIELDS.map(f => f.key))
        if (error) { setError('Could not load settings.'); setLoading(false); return }
        const map = {}
        data.forEach(row => { map[row.key] = row.value })
        setValues(map)
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        setError(null)
        const upserts = PDF_FIELDS.map(f => ({ key: f.key, value: values[f.key] ?? '' }))
        const { error } = await supabase
            .from('site_settings')
            .upsert(upserts, { onConflict: 'key' })
        if (error) {
            setError('Failed to save: ' + error.message)
        } else {
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        }
        setSaving(false)
    }

    const contactItems = [
        values.pdf_contact_name,
        values.pdf_contact_phone ? `Tel: ${values.pdf_contact_phone}` : '',
        values.pdf_contact_email,
        values.pdf_contact_whatsapp ? `WhatsApp: ${values.pdf_contact_whatsapp}` : '',
    ].filter(Boolean)

    if (loading) return <div className="loading">Loading settings…</div>

    return (
        <div className="admin-page-content">
            <div className="edit-header">
                <h2><FileText size={20} /> PDF Settings</h2>
                <button
                    className={`btn-save ${saved ? 'saved' : ''}`}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saved
                        ? <><Check size={15} /> Saved!</>
                        : <><Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}</>
                    }
                </button>
            </div>

            {error && <div className="import-error" style={{ marginBottom: 20 }}>{error}</div>}

            {/* Branding fields */}
            <div className="settings-section">
                <h3 className="settings-section-title">Branding &amp; Contact Details</h3>
                <p className="settings-section-hint">
                    These details appear on every exported testimonial PDF — the logo in the top-right
                    corner of the page and your contact information pinned to the footer. Set them once
                    and all PDFs will use them automatically.
                </p>

                <div className="settings-fields">
                    {PDF_FIELDS.map(f => (
                        <div key={f.key} className="settings-field">
                            <label className="settings-label">{f.label}</label>
                            <p className="settings-hint">{f.hint}</p>
                            <div className="settings-input-row">
                                <input
                                    type={f.type}
                                    className="settings-input"
                                    value={values[f.key] ?? ''}
                                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                                />
                                {f.type === 'url' && values[f.key] && (
                                    <a
                                        href={values[f.key]}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="settings-preview-link"
                                        title="Open URL"
                                    >
                                        <ExternalLink size={15} />
                                    </a>
                                )}
                            </div>

                            {f.key === 'pdf_logo_url' && values[f.key] && (
                                <div className="settings-image-preview settings-logo-preview">
                                    <img src={values[f.key]} alt="Logo preview" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer preview */}
            {(contactItems.length > 0 || values.pdf_footer_tagline?.trim()) && (
                <div className="settings-section">
                    <h3 className="settings-section-title">Footer Preview</h3>
                    <p className="settings-section-hint">
                        Approximate appearance of the footer bar at the bottom of each exported PDF.
                    </p>
                    <div className="pdf-footer-preview-bar">
                        {contactItems.length > 0 && (
                            <>
                                <span className="pdf-footer-preview-contact-label">Contact me today</span>
                                <span className="pdf-footer-preview-items">
                                    {contactItems.join('  ·  ')}
                                </span>
                            </>
                        )}
                        {values.pdf_footer_tagline?.trim() && (
                            <span className="pdf-footer-preview-tagline">{values.pdf_footer_tagline}</span>
                        )}
                    </div>
                </div>
            )}

            <div className="settings-save-bar">
                <button
                    className={`btn-save ${saved ? 'saved' : ''}`}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saved
                        ? <><Check size={15} /> Saved!</>
                        : <><Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}</>
                    }
                </button>
            </div>
        </div>
    )
}
