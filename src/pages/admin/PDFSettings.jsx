import { useState, useEffect } from 'react'
import Alert from '../../components/Alert'
import { supabase } from '../../lib/supabase'
import { Save, Check, ExternalLink, FileText } from 'lucide-react'
import { FormSkeleton } from '../../components/Skeleton'
import { invalidatePDFSettingsCache, preparePDFSettings } from '../../lib/pdfExport'
import PDFPreviewDialog from '../../components/PDFPreviewDialog'
import { useCanPreviewPdf } from '../../lib/useCanPreviewPdf'
import { PDF_DISCLAIMER, PDF_COPYRIGHT } from '../../lib/pdfText'

const PDF_FIELDS = [
    {
        key: 'pdf_logo_url',
        label: 'Logo URL',
        placeholder: 'https://…/logo.png',
        hint: 'Optional. URL of a logo to show at the top left of every PDF, in place of the Mtech Testimonials logo. Upload via Image Manager and paste the public URL here.',
        type: 'url',
    },
    {
        key: 'pdf_contact_name',
        label: 'Your Name',
        placeholder: 'e.g. Jane Smith',
        hint: 'Your name as it appears in the PDF footer (e.g. Jane Smith).',
        type: 'text',
    },
    {
        key: 'pdf_contact_phone',
        label: 'Phone Number',
        placeholder: 'e.g. 082 123 4567',
        hint: 'Phone number shown in the PDF footer.',
        type: 'text',
    },
    {
        key: 'pdf_contact_email',
        label: 'Email Address',
        placeholder: 'e.g. jane@example.co.za',
        hint: 'Email address shown in the PDF footer.',
        type: 'email',
    },
    {
        key: 'pdf_contact_whatsapp',
        label: 'WhatsApp Number',
        placeholder: 'e.g. 082 123 4567',
        hint: 'WhatsApp number shown in the PDF footer.',
        type: 'text',
    },
    {
        key: 'pdf_footer_tagline',
        label: 'Footer Tagline',
        placeholder: 'e.g. Mannatech | Transforming lives naturally',
        hint: 'A short line shown below the contact details (e.g. Mannatech | Transforming Lives Naturally).',
        type: 'text',
    },
    {
        key: 'pdf_font_threshold',
        label: 'Compact Font Threshold (characters)',
        placeholder: '1200',
        hint: 'Testimonials longer than this character count will use a smaller font to save space. Default is 1200. Increase to keep normal size for longer testimonials, decrease to compact sooner.',
        type: 'number',
    },
]

// Boolean display toggles. Stored as 'true' / 'false' strings in site_settings.
// Absent (never saved) defaults to shown, preserving existing PDF behaviour.
const PDF_TOGGLES = [
    {
        key: 'pdf_show_name',
        label: "Show the person's name",
        hint: "When on, the testimonial author's name (or “Anonymous”) appears in the line under the title. Turn off to hide it entirely.",
    },
    {
        key: 'pdf_show_date',
        label: 'Show the date',
        hint: 'When on, the testimonial date appears in the line under the title. Turn off to hide it entirely.',
    },
]

const ALL_KEYS = [...PDF_FIELDS.map(f => f.key), ...PDF_TOGGLES.map(t => t.key)]

export default function PDFSettings() {
    const [values, setValues]   = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState(false)
    const [saved, setSaved]     = useState(false)
    const [error, setError]     = useState(null)
    const [pdfPreview, setPdfPreview] = useState(null) // { testimonial, settings }
    const [preparing, setPreparing]   = useState(false)
    const canPreviewPdf = useCanPreviewPdf()

    useEffect(() => { loadSettings() }, [])

    async function loadSettings() {
        const { data, error } = await supabase
            .from('site_settings')
            .select('key, value')
            .in('key', ALL_KEYS)
        if (error) { console.error(error); setError('PDF settings could not be loaded. Refresh the page to try again.'); setLoading(false); return }
        const map = {}
        data.forEach(row => { map[row.key] = row.value })
        setValues(map)
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        setError(null)
        const upserts = [
            ...PDF_FIELDS.map(f => ({ key: f.key, value: values[f.key] ?? '' })),
            // Toggles default to 'true' (shown) when the admin hasn't touched them
            ...PDF_TOGGLES.map(t => ({ key: t.key, value: values[t.key] === 'false' ? 'false' : 'true' })),
        ]
        const { error } = await supabase
            .from('site_settings')
            .upsert(upserts, { onConflict: 'key' })
        if (error) {
            console.error(error)
            setError('Your PDF settings could not be saved. Check your connection and try again.')
        } else {
            invalidatePDFSettingsCache()
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        }
        setSaving(false)
    }

    // Real PDF with the unsaved values, using the newest published testimonial
    // (one with photos when there is one). Read-only: nothing is saved.
    async function previewRealPdf() {
        setPreparing(true)
        setError(null)
        try {
            const { data } = await supabase.from('testimonials').select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(20)
            const sample = (data || []).find(t => t.gallery_urls?.length) || data?.[0]
            if (!sample) { setError('There is no published testimonial to preview yet.'); return }
            setPdfPreview({ testimonial: sample, settings: await preparePDFSettings(values) })
        } finally {
            setPreparing(false)
        }
    }

    const contactItems = [
        values.pdf_contact_name,
        values.pdf_contact_phone ? `Tel: ${values.pdf_contact_phone}` : '',
        values.pdf_contact_email,
        values.pdf_contact_whatsapp ? `WhatsApp: ${values.pdf_contact_whatsapp}` : '',
    ].filter(Boolean)

    const previewMeta = [
        values.pdf_show_name !== 'false' ? 'By Thandiwe M.' : '',
        values.pdf_show_date !== 'false' ? '12 March 2026' : '',
    ].filter(Boolean).join('   ·   ')

    if (loading) return <FormSkeleton sections={5} />

    return (
        <div className="admin-page-content">
            <div className="edit-header">
                <h1>PDF Settings</h1>
                <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saved
                        ? <><Check size={15} /> Saved!</>
                        : <><Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}</>
                    }
                </button>
            </div>

            {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

            {/* Branding fields */}
            <div className="settings-section">
                <h3 className="settings-section-title">Branding &amp; Contact Details</h3>
                <p className="settings-section-hint">
                    These details appear on every exported testimonial PDF: the logo at the top of the
                    page and your contact details in the footer, above the legal disclaimer. Set them once
                    and all PDFs will use them automatically.
                </p>

                <div className="settings-fields">
                    {PDF_FIELDS.map(f => (
                        <div key={f.key} className="settings-field">
                            <label className="settings-label" htmlFor={f.key}>{f.label}</label>
                            <p className="settings-hint" id={`${f.key}-hint`}>{f.hint}</p>
                            <div className="settings-input-row">
                                <input
                                    id={f.key}
                                    aria-describedby={`${f.key}-hint`}
                                    placeholder={f.placeholder}
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

            {/* Display options */}
            <div className="settings-section">
                <h3 className="settings-section-title">Display Options</h3>
                <p className="settings-section-hint">
                    Control which details appear in the line beneath the testimonial title on each PDF.
                </p>
                <div className="settings-fields">
                    {PDF_TOGGLES.map(t => (
                        <label key={t.key} className="pdf-toggle-field">
                            <input
                                type="checkbox"
                                checked={values[t.key] !== 'false'}
                                onChange={e => setValues(v => ({ ...v, [t.key]: e.target.checked ? 'true' : 'false' }))}
                            />
                            <span className="pdf-toggle-text">
                                <span className="settings-label">{t.label}</span>
                                <span className="settings-hint">{t.hint}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Live preview of the exported PDF (ui-guide .pdf-preview) */}
            <div className="settings-section">
                <h3 className="settings-section-title">Preview</h3>
                <p className="settings-section-hint">
                    How the top and bottom of each exported PDF will look with these settings. Updates as you type.
                    {canPreviewPdf && ' To check the whole page, preview a real testimonial before you save.'}
                </p>
                {canPreviewPdf && (
                    <button type="button" className="btn-secondary pdf-preview-real" onClick={previewRealPdf} disabled={preparing}>
                        <FileText size={16} aria-hidden="true" /> {preparing ? 'Preparing…' : 'Preview with a real testimonial'}
                    </button>
                )}
                <div className="pdf-preview" aria-label="PDF preview">
                    <div className="ph">
                        <img src={values.pdf_logo_url?.trim() || '/mtech-testimonials-logo.svg'} alt="" />
                    </div>
                    <p className="pt">My energy came back</p>
                    {previewMeta && <p className="pm">{previewMeta}</p>}
                    <p className="pq">I kept waiting for the usual afternoon slump and it just didn&rsquo;t come. My family noticed before I said anything.</p>
                    <div className="ptags">
                        <span className="tag tag-condition">Energy</span>
                        <span className="tag tag-product">Ambrotose Complex</span>
                    </div>
                    <div className="pf">
                        {(contactItems.length > 0 || values.pdf_footer_tagline?.trim()) && (
                            <div className="pc">
                                {contactItems.length > 0 && <>
                                    <div className="pcl">Contact me today</div>
                                    <div className="pci">{contactItems.join('  ·  ')}</div>
                                </>}
                                {values.pdf_footer_tagline?.trim() && <div className="pctag">{values.pdf_footer_tagline}</div>}
                            </div>
                        )}
                        {PDF_DISCLAIMER} &copy; {new Date().getFullYear()} {PDF_COPYRIGHT}
                    </div>
                </div>
            </div>

            {pdfPreview && (
                <PDFPreviewDialog
                    testimonial={pdfPreview.testimonial}
                    settings={pdfPreview.settings}
                    onClose={() => setPdfPreview(null)}
                />
            )}

            <div className="settings-save-bar">
                <button
                    className="btn-primary"
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
