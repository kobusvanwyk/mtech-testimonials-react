import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Settings as SettingsIcon, Save, Check, ExternalLink, FileDown } from 'lucide-react'

const FIELDS = [
    {
        key: 'og_site_name',
        label: 'Site Name',
        hint: 'Appears in the browser tab and as the OG site name.',
        type: 'text',
    },
    {
        key: 'og_title',
        label: 'OG Title',
        hint: 'The bold title shown in WhatsApp/Facebook link previews.',
        type: 'text',
    },
    {
        key: 'og_description',
        label: 'OG Description',
        hint: 'The subtitle shown in link previews. Keep it under 160 characters.',
        type: 'textarea',
    },
    {
        key: 'og_image_url',
        label: 'OG Image URL',
        hint: 'The image shown when the homepage link is shared. Recommended size: 1200×630px.',
        type: 'url',
    },
    {
        key: 'og_url',
        label: 'Site URL',
        hint: 'The canonical URL of the site (e.g. https://mtechtestimonials.co.za).',
        type: 'url',
    },
]

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

export default function Settings() {
    const [values, setValues]   = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState(false)
    const [saved, setSaved]     = useState(false)
    const [error, setError]     = useState(null)

    useEffect(() => { loadSettings() }, [])

    async function loadSettings() {
        const { data, error } = await supabase.from('site_settings').select('key, value')
        if (error) { setError('Could not load settings.'); setLoading(false); return }
        const map = {}
        data.forEach(row => { map[row.key] = row.value })
        setValues(map)
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        setError(null)

        const upserts = [...FIELDS, ...PDF_FIELDS].map(f => ({ key: f.key, value: values[f.key] ?? '' }))
        const { error } = await supabase
            .from('site_settings')
            .upsert(upserts, { onConflict: 'key' })

        if (error) {
            setError('Failed to save settings: ' + error.message)
        } else {
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        }
        setSaving(false)
    }

    if (loading) return <div className="loading">Loading settings…</div>

    return (
        <div className="admin-page-content">
            <div className="edit-header">
                <h2><SettingsIcon size={20} /> Site Settings</h2>
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

            <div className="settings-section">
                <h3 className="settings-section-title">Open Graph / Social Sharing</h3>
                <p className="settings-section-hint">
                    These values control how the site appears when links are shared on WhatsApp,
                    Facebook, and other platforms. Testimonial pages automatically use the
                    testimonial title and a story excerpt — the image below is used everywhere.
                </p>

                <div className="settings-fields">
                    {FIELDS.map(f => (
                        <div key={f.key} className="settings-field">
                            <label className="settings-label">{f.label}</label>
                            <p className="settings-hint">{f.hint}</p>
                            {f.type === 'textarea' ? (
                                <textarea
                                    className="settings-input settings-textarea"
                                    value={values[f.key] ?? ''}
                                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                                    rows={3}
                                />
                            ) : (
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
                            )}

                            {/* Image preview */}
                            {f.key === 'og_image_url' && values[f.key] && (
                                <div className="settings-image-preview">
                                    <img src={values[f.key]} alt="OG preview" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* PDF Branding */}
            <div className="settings-section">
                <h3 className="settings-section-title"><FileDown size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />PDF Branding</h3>
                <p className="settings-section-hint">
                    These details appear on every exported testimonial PDF — the logo in the top-right corner
                    and your contact information in the footer. Set them once and all PDFs will use them automatically.
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

                {/* Footer preview */}
                {(values.pdf_contact_name || values.pdf_contact_phone || values.pdf_contact_email || values.pdf_footer_tagline) && (
                    <div className="pdf-footer-preview">
                        <p className="pdf-footer-preview-label">PDF footer preview</p>
                        <div className="pdf-footer-preview-bar">
                            <span className="pdf-footer-preview-contact-label">Contact me today</span>
                            <span className="pdf-footer-preview-items">
                                {[
                                    values.pdf_contact_name,
                                    values.pdf_contact_phone ? `Tel: ${values.pdf_contact_phone}` : '',
                                    values.pdf_contact_email,
                                    values.pdf_contact_whatsapp ? `WhatsApp: ${values.pdf_contact_whatsapp}` : '',
                                ].filter(Boolean).join('  ·  ')}
                            </span>
                            {values.pdf_footer_tagline && (
                                <span className="pdf-footer-preview-tagline">{values.pdf_footer_tagline}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* WhatsApp preview mockup */}
            <div className="settings-section">
                <h3 className="settings-section-title">Preview</h3>
                <p className="settings-section-hint">Approximate appearance when shared on WhatsApp.</p>
                <div className="og-preview-card">
                    {values.og_image_url && (
                        <div className="og-preview-image">
                            <img src={values.og_image_url} alt="OG" />
                        </div>
                    )}
                    <div className="og-preview-body">
                        <div className="og-preview-site">{values.og_url?.replace(/^https?:\/\//, '') || 'mtechtestimonials.co.za'}</div>
                        <div className="og-preview-title">{values.og_title || 'Mannatech Testimonials Database'}</div>
                        <div className="og-preview-desc">{values.og_description || '—'}</div>
                    </div>
                </div>
            </div>

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
