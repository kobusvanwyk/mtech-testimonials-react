import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileDown, X, AlertCircle } from 'lucide-react'
import { useDialog } from '../lib/useDialog'
import { loadPDFSettings, buildPdfBlob, buildPdfFilename, saveBlob } from '../lib/pdfExport'

// Shows the real exported PDF in the browser's own viewer (ui-guide modal).
// Mount it only while open. `settings` is optional: PDF Settings passes its
// unsaved values (already prepared); everyone else uses the saved settings.
export default function PDFPreviewDialog({ testimonial, settings, onClose }) {
    const [state, setState] = useState({ status: 'building' }) // building | ready | error
    const ref = useDialog(true, onClose)

    useEffect(() => {
        let url = null
        let cancelled = false
        ;(async () => {
            try {
                const s = settings || await loadPDFSettings()
                const blob = await buildPdfBlob(testimonial, s)
                if (cancelled) return
                url = URL.createObjectURL(blob)
                setState({ status: 'ready', blob, url })
            } catch (err) {
                console.error('PDF preview failed:', err)
                if (!cancelled) setState({ status: 'error' })
            }
        })()
        return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
    }, [testimonial, settings])

    async function download() {
        if (state.status !== 'ready') return
        saveBlob(state.blob, await buildPdfFilename(testimonial))
    }

    // Portal to <body> so no container query or transform can trap the overlay.
    return createPortal(
        <div className="pdf-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="pdf-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="pdf-modal-title">
                <div className="pdf-modal-hd">
                    <div className="pdf-modal-heading">
                        <h2 id="pdf-modal-title">PDF preview</h2>
                        <p>{testimonial.title || 'Untitled testimonial'}</p>
                    </div>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Close preview">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="pdf-modal-bd" aria-busy={state.status === 'building'}>
                    {state.status === 'building' && (
                        <div className="pdf-modal-loading">
                            <div className="pdf-modal-sheet skel" aria-hidden="true" />
                            <p role="status">Building the PDF…</p>
                        </div>
                    )}
                    {state.status === 'error' && (
                        <div className="pdf-modal-loading" role="alert">
                            <AlertCircle size={24} aria-hidden="true" />
                            <p>The PDF could not be built. Close this and try again.</p>
                        </div>
                    )}
                    {state.status === 'ready' && (
                        <iframe
                            className="pdf-modal-frame"
                            src={`${state.url}#navpanes=0&view=FitH`}
                            title={`PDF preview of ${testimonial.title || 'testimonial'}`}
                        />
                    )}
                </div>

                <div className="pdf-modal-ft">
                    <button type="button" className="btn-secondary" onClick={onClose} data-autofocus>Close</button>
                    <button type="button" className="btn-primary" onClick={download} disabled={state.status !== 'ready'}>
                        <FileDown size={16} aria-hidden="true" /> Download PDF
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
