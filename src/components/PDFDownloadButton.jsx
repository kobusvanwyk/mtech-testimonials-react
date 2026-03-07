import { useState, useEffect } from 'react'
import { FileDown } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { supabase } from '../lib/supabase'
import { TestimonialPDF } from './TestimonialPDF'

const PDF_KEYS = [
    'pdf_logo_url',
    'pdf_contact_name',
    'pdf_contact_phone',
    'pdf_contact_email',
    'pdf_contact_whatsapp',
    'pdf_footer_tagline',
    'pdf_font_threshold',
]

// Singleton settings cache — fetched once, reused across all buttons
let settingsCache = null
let settingsPromise = null

function loadPDFSettings() {
    if (settingsCache) return Promise.resolve(settingsCache)
    if (settingsPromise) return settingsPromise
    settingsPromise = supabase
        .from('site_settings')
        .select('key, value')
        .in('key', PDF_KEYS)
        .then(({ data }) => {
            const map = {}
            ;(data || []).forEach(r => { map[r.key] = r.value })
            settingsCache = map
            return map
        })
    return settingsPromise
}

// ─── Button variants ──────────────────────────────────────────────────────────
// variant="full"  → teal button with icon + text (for Single page & EditTestimonial)
// variant="icon"  → icon-only small button (for table rows)

export function PDFDownloadButton({ testimonial, variant = 'full', className = '' }) {
    const [settings, setSettings] = useState(null)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        loadPDFSettings().then(setSettings)
    }, [])

    async function handleDownload() {
        if (!settings) return
        setDownloading(true)
        try {
            const blob = await pdf(
                <TestimonialPDF testimonial={testimonial} settings={settings} />
            ).toBlob()
            const url = URL.createObjectURL(blob)
            const a   = document.createElement('a')
            a.href     = url
            a.download = `testimonial-${testimonial.slug || testimonial.id}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('PDF generation failed:', err)
            alert('Could not generate PDF. Please try again.')
        } finally {
            setDownloading(false)
        }
    }

    if (variant === 'icon') {
        return (
            <button
                className={`row-action-btn pdf-icon ${className}`}
                onClick={handleDownload}
                disabled={downloading || !settings}
                title="Download PDF"
            >
                <FileDown size={14} />
            </button>
        )
    }

    return (
        <button
            className={`btn-pdf-download ${className}`}
            onClick={handleDownload}
            disabled={downloading || !settings}
        >
            <FileDown size={15} />
            {downloading ? 'Generating…' : 'Download PDF'}
        </button>
    )
}
