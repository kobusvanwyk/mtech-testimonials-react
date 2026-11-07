import { useState, useEffect } from 'react'
import Alert from '../../components/Alert'
import { supabase } from '../../lib/supabase'
import { FormSkeleton } from '../../components/Skeleton'
import { useSiteSettings } from '../../lib/SiteSettingsContext'
import { useToast } from '../../lib/feedback'
import { invalidatePDFSettingsCache } from '../../lib/pdfExport'
import { NAME_MODES } from '../../lib/displayName'
import { Save, Check, ExternalLink, EyeOff, Eye, UserRound } from 'lucide-react'

const FIELDS = [
    { key: 'og_site_name',    label: 'Site Name',       hint: 'Appears in the browser tab and as the OG site name.',                                           type: 'text',     placeholder: 'e.g. Mannatech Testimonials Database' },
    { key: 'og_title',        label: 'OG Title',         hint: 'The bold title shown in WhatsApp/Facebook link previews.',                                       type: 'text',     placeholder: 'e.g. Real testimonials from Mannatech South Africa' },
    { key: 'og_description',  label: 'OG Description',   hint: 'The subtitle shown in link previews. Keep it under 160 characters.',                             type: 'textarea', placeholder: 'One or two sentences about the site, under 160 characters' },
    { key: 'og_image_url',    label: 'OG Image URL',     hint: 'The image shown when the homepage link is shared. Recommended size: 1200×630px.',                type: 'url',      placeholder: 'https://…/share-image.jpg' },
    { key: 'og_url',          label: 'Site URL',         hint: 'The canonical URL of the site (e.g. https://mtechtestimonials.co.za).',                          type: 'url',      placeholder: 'https://mtechtestimonials.co.za' },
]

// Image preview that says so when the URL does not load, instead of a broken
// image with alt text. `quiet` hides it entirely (the link preview card).
function PreviewImage({ src, className, quiet }) {
    const [failed, setFailed] = useState(false)
    if (failed) {
        return quiet ? null : (
            <p className={`${className} settings-image-failed`} role="status">
                This image could not be loaded. Check that the URL is public and points to an image.
            </p>
        )
    }
    return <div className={className}><img src={src} alt="" onError={() => setFailed(true)} /></div>
}

export default function Settings() {
    const { privateMode, setPrivateModeValue, nameDisplay, setNameDisplayValue, showDates, setShowDatesValue } = useSiteSettings()
    const toast = useToast()
    const [savingNames, setSavingNames] = useState(false)
    const [toggling, setToggling] = useState(false)
    const [values, setValues]   = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState(false)
    const [saved, setSaved]     = useState(false)
    const [error, setError]     = useState(null)

    useEffect(() => { loadSettings() }, [])

    async function loadSettings() {
        const { data, error } = await supabase.from('site_settings').select('key, value')
        if (error) { console.error(error); setError('Settings could not be loaded. Refresh the page to try again.'); setLoading(false); return }
        const map = {}
        data.forEach(row => { map[row.key] = row.value })
        setValues(map)
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        setError(null)
        const upserts = FIELDS.map(f => ({ key: f.key, value: values[f.key] ?? '' }))
        const { error } = await supabase.from('site_settings').upsert(upserts, { onConflict: 'key' })
        if (error) { console.error(error); setError('Your settings could not be saved. Check your connection and try again.') }
        else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
        setSaving(false)
    }

    async function handleTogglePrivateMode() {
        setToggling(true)
        await setPrivateModeValue(!privateMode)
        setToggling(false)
    }

    // Saves straight away, like Private Mode. PDFs pick it up on the next export.
    async function handleNameDisplay(val) {
        if (val === nameDisplay) return
        setSavingNames(true)
        const err = await setNameDisplayValue(val)
        setSavingNames(false)
        if (err) {
            console.error(err)
            toast.error('The name setting could not be saved. Check your connection and try again.')
            return
        }
        invalidatePDFSettingsCache()
        toast.success(`Names: ${NAME_MODES.find(m => m.value === val).label}. The public site and PDFs now follow this.`)
    }

    async function handleShowDates(val) {
        setSavingNames(true)
        const err = await setShowDatesValue(val)
        setSavingNames(false)
        if (err) {
            console.error(err)
            toast.error('The date setting could not be saved. Check your connection and try again.')
            return
        }
        invalidatePDFSettingsCache()
        toast.success(val ? 'Dates now show on the public site and PDFs.' : 'Dates are now hidden on the public site and PDFs.')
    }

    if (loading) return <FormSkeleton sections={4} />

    return (
        <div className="admin-page-content">
            <div className="edit-header">
                <h1>Settings</h1>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}</>}
                </button>
            </div>

            {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

            {/* Private Mode */}
            <div className={`settings-section settings-private-mode${privateMode ? ' is-private' : ''}`}>
                <div className="private-mode-row">
                    <div className="private-mode-info">
                        <h3 className="settings-section-title">
                            {privateMode ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            Private Mode
                            <span className={`status-badge ${privateMode ? 'badge-warning' : 'badge-approved'}`}>
                                {privateMode ? 'Private' : 'Public'}
                            </span>
                        </h3>
                        <p className="settings-section-hint">
                            {privateMode
                                ? 'The site is currently private. Only the submission form, Terms and Privacy pages are accessible to visitors. Admin is always accessible.'
                                : 'The site is currently public. All pages are visible to everyone.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleTogglePrivateMode}
                        disabled={toggling}
                    >
                        {toggling ? 'Updating…' : privateMode ? 'Disable Private Mode' : 'Enable Private Mode'}
                    </button>
                </div>
            </div>

            {/* Names on the public site */}
            <fieldset className="settings-section settings-names" disabled={savingNames}>
                <legend className="settings-section-title">
                    <UserRound size={18} aria-hidden="true" /> Names and dates on the public site
                </legend>
                <p className="settings-section-hint">
                    How people's names, avatars and the date show on testimonial cards, testimonial pages, search and PDFs. Admin screens always show the real name. Testimonials ticked Anonymous stay anonymous in every option. Saves straight away.
                </p>
                <div className="name-modes">
                    {NAME_MODES.map(m => (
                        <label key={m.value} className={`name-mode${nameDisplay === m.value ? ' is-on' : ''}`}>
                            <input
                                type="radio"
                                name="name_display"
                                value={m.value}
                                checked={nameDisplay === m.value}
                                onChange={() => handleNameDisplay(m.value)}
                            />
                            <span className="name-mode-text">
                                <strong>{m.label}</strong>
                                <span>{m.hint}</span>
                            </span>
                        </label>
                    ))}
                </div>
                <label className={`name-mode date-mode${showDates ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={showDates} onChange={e => handleShowDates(e.target.checked)} />
                    <span className="name-mode-text">
                        <strong>Show the date</strong>
                        <span>The date each testimonial was published. Untick to hide it everywhere public, including PDFs.</span>
                    </span>
                </label>
                {nameDisplay !== 'full' && (
                    <p className="settings-hint name-modes-note">
                        Names can still appear in a testimonial's title or text (for example "Dewald's recovery"). Edit those testimonials if they need to be fully anonymous.
                    </p>
                )}
            </fieldset>

            <div className="settings-section">
                <h3 className="settings-section-title">Open Graph / Social Sharing</h3>
                <p className="settings-section-hint">
                    These values control how the site appears when links are shared on WhatsApp,
                    Facebook, and other platforms. Testimonial pages automatically use the
                    testimonial title and a testimonial excerpt, the image below is used everywhere.
                </p>
                <div className="settings-fields">
                    {FIELDS.map(f => (
                        <div key={f.key} className="settings-field">
                            <label className="settings-label" htmlFor={f.key}>{f.label}</label>
                            <p className="settings-hint" id={`${f.key}-hint`}>{f.hint}</p>
                            {f.type === 'textarea' ? (
                                <textarea id={f.key} aria-describedby={`${f.key}-hint`} placeholder={f.placeholder} className="settings-input settings-textarea" value={values[f.key] ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} rows={3} />
                            ) : (
                                <div className="settings-input-row">
                                    <input id={f.key} aria-describedby={`${f.key}-hint`} placeholder={f.placeholder} type={f.type} className="settings-input" value={values[f.key] ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
                                    {f.type === 'url' && values[f.key] && (
                                        <a href={values[f.key]} target="_blank" rel="noreferrer" className="settings-preview-link" title="Open URL"><ExternalLink size={15} /></a>
                                    )}
                                </div>
                            )}
                            {f.key === 'og_image_url' && values[f.key] && (
                                <PreviewImage key={values[f.key]} src={values[f.key]} className="settings-image-preview" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">Preview</h3>
                <p className="settings-section-hint">Approximate appearance when shared on WhatsApp.</p>
                <div className="og-preview-card">
                    {values.og_image_url && <PreviewImage key={values.og_image_url} src={values.og_image_url} className="og-preview-image" quiet />}
                    <div className="og-preview-body">
                        <div className="og-preview-site">{values.og_url?.replace(/^https?:\/\//, '') || 'mtechtestimonials.co.za'}</div>
                        <div className="og-preview-title">{values.og_title || 'Mannatech Testimonials Database'}</div>
                        <div className="og-preview-desc">{values.og_description || '-'}</div>
                    </div>
                </div>
            </div>

            <div className="settings-save-bar">
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}</>}
                </button>
            </div>
        </div>
    )
}
