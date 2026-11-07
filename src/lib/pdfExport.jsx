import { pdf } from '@react-pdf/renderer'
import { supabase } from './supabase'
import { TestimonialPDF } from '../components/TestimonialPDF'

// PDF export helpers shared by the Download button, the Preview PDF dialog and
// PDF Settings. Kept out of the component files so fast refresh keeps working.

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
    'name_display',   // site-wide name rule (Settings), applied in the PDF too
    'show_dates',     // site-wide date switch (Settings), likewise
]

// Singleton settings cache, fetched once, reused across all buttons
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
        console.warn('PDF logo fetch failed, skipping logo:', url)
        return null
    }
}

const BRAND_LOGO = '/mtech-testimonials-logo.svg'

// react-pdf cannot draw SVG files, so rasterise the brand logo at print size.
async function svgToPng(url, height = 140) {
    try {
        const img = new window.Image()
        img.src = url
        await img.decode()
        const ratio = (img.naturalWidth || 4) / (img.naturalHeight || 1)
        const canvas = document.createElement('canvas')
        canvas.height = height
        canvas.width = Math.round(height * ratio)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/png')
    } catch {
        console.warn('PDF brand logo could not be drawn, using text instead')
        return null
    }
}

// Turn raw site_settings values into what TestimonialPDF needs: the custom
// logo as base64 (avoids CORS in react-pdf), or the brand logo as a PNG.
// Exported so PDF Settings can preview unsaved values.
export async function preparePDFSettings(raw) {
    const map = { ...raw }
    delete map._brand_logo
    if (map.pdf_logo_url?.trim()) {
        const b64 = await fetchImageAsBase64(map.pdf_logo_url)
        if (b64) map.pdf_logo_url = b64
    } else {
        map._brand_logo = await svgToPng(BRAND_LOGO)
    }
    return map
}

export function loadPDFSettings() {
    if (settingsCache) return Promise.resolve(settingsCache)
    if (settingsPromise) return settingsPromise
    settingsPromise = supabase
        .from('site_settings')
        .select('key, value')
        .in('key', PDF_KEYS)
        .then(async ({ data }) => {
            const map = {}
            ;(data || []).forEach(r => { map[r.key] = r.value })
            settingsCache = await preparePDFSettings(map)
            return settingsCache
        })
    return settingsPromise
}

// Build the PDF in the browser. Gallery images are converted to base64 first
// to avoid CORS issues in react-pdf. Used by Download and by the preview dialog.
export async function buildPdfBlob(testimonial, settings) {
    const galleryUrls = testimonial.gallery_urls || []
    const galleryBase64 = await Promise.all(
        galleryUrls.map(url => fetchImageAsBase64(url).then(b64 => b64 || url))
    )
    return pdf(
        <TestimonialPDF testimonial={{ ...testimonial, gallery_urls: galleryBase64 }} settings={settings} />
    ).toBlob()
}

export function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

export async function buildPdfFilename(t) {
    const raw = (t.title || '').trim()
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
