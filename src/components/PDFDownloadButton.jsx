import { useState, useEffect } from 'react'
import { FileDown } from 'lucide-react'
import { loadPDFSettings, buildPdfBlob, buildPdfFilename, saveBlob } from '../lib/pdfExport'
import { useToast } from '../lib/feedback'

// ─── Button variants ──────────────────────────────────────────────────────────
// variant="full"  → teal button with icon + text (for Single page & EditTestimonial)
// variant="icon"  → icon-only small button (for table rows)

export function PDFDownloadButton({ testimonial, variant = 'full', className = '' }) {
    const [settings, setSettings] = useState(null)
    const [downloading, setDownloading] = useState(false)
    const toast = useToast()

    useEffect(() => {
        loadPDFSettings().then(setSettings)
    }, [])

    async function handleDownload() {
        if (!settings) return
        setDownloading(true)
        try {
            const blob = await buildPdfBlob(testimonial, settings)
            saveBlob(blob, await buildPdfFilename(testimonial))
        } catch (err) {
            console.error('PDF generation failed:', err)
            toast.error('The PDF could not be created. Check your connection and try again.')
        } finally {
            setDownloading(false)
        }
    }

    if (variant === 'menuitem') {
        return (
            <button
                type="button"
                role="menuitem"
                className={className}
                onClick={handleDownload}
                disabled={downloading || !settings}
            >
                <FileDown size={16} aria-hidden="true" />
                {downloading ? 'Generating PDF…' : 'Download PDF'}
            </button>
        )
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
