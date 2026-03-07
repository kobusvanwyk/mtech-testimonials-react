import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Settings as SettingsIcon, Save, Check, ExternalLink } from 'lucide-react'

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

        const upserts = FIELDS.map(f => ({ key: f.key, value: values[f.key] ?? '' }))
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
