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
    'pdf_show_name',
    'pdf_show_date',
]

// Singleton settings cache — fetched once, reused across all buttons
let settingsCache = null
let settingsPromise = null

export function invalidatePDFSettingsCache() {
    settingsCache = null
    settingsPromise = null
}

async function fetchImageAsBase64(url) {
    try {
        const res = await fetch(url)
        const blob = await res.blob()
        return await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    } catch {
        console.warn('PDF logo fetch failed — skipping logo:', url)
        return null
    }
}

function loadPDFSettings() {
    if (settingsCache) return Promise.resolve(settingsCache)
    if (settingsPromise) return settingsPromise
    settingsPromise = supabase
        .from('site_settings')
        .select('key, value')
        .in('key', PDF_KEYS)
        .then(async ({ data }) => {
            const map = {}
            ;(data || []).forEach(r => { map[r.key] = r.value })
            // Pre-convert logo to base64 to avoid CORS issues in react-pdf
            if (map.pdf_logo_url?.trim()) {
                const b64 = await fetchImageAsBase64(map.pdf_logo_url)
                if (b64) map.pdf_logo_url = b64
            }
            settingsCache = map
            return map
        })
    return settingsPromise
}

// ─── Filename ─────────────────────────────────────────────────────────────────
// Human-readable, brand-prefixed PDF filename built from the title (falls back to
// person name, then a generic label). When the title isn't unique in the database,
// a sequential number is appended so same-titled testimonials stay distinguishable.
function sanitizeForFilename(s) {
    return (s || '')
        .replace(/\*\*|__/g, '')                       // strip stray markdown
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')     // illegal filename chars
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120)
        .trim()
}

async function buildPdfFilename(t) {
    const raw = (t.title || '').trim()
        || (t.anonymous ? '' : (t.person_name || '').trim())
        || 'Testimonial'
    const safe = sanitizeForFilename(raw) || 'Testimonial'

    let suffix = ''
    try {
        if (t.title) {
            const { data } = await supabase
                .from('testimonials')
                .select('id, created_at')
                .eq('title', t.title)
                .order('created_at', { ascending: true })
                .order('id', { ascending: true })
            if (data && data.length > 1) {
                const pos = data.findIndex(r => r.id === t.id)
                suffix = ` (${pos >= 0 ? pos + 1 : data.length})`
            }
        }
    } catch { /* on any error, fall back to no number */ }

    return `Mannatech Testimonial - ${safe}${suffix}.pdf`
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
            // Convert gallery images to base64 to avoid CORS issues
            const galleryUrls = testimonial.gallery_urls || []
            const galleryBase64 = await Promise.all(
                galleryUrls.map(url => fetchImageAsBase64(url).then(b64 => b64 || url))
            )
            const testimonialWithBase64 = {
                ...testimonial,
                gallery_urls: galleryBase64,
            }
            const blob = await pdf(
                <TestimonialPDF testimonial={testimonialWithBase64} settings={settings} />
            ).toBlob()
            const url = URL.createObjectURL(blob)
            const a   = document.createElement('a')
            a.href     = url
            a.download = await buildPdfFilename(testimonial)
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
