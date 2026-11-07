import { useState, useEffect } from 'react'

// Phones have no inline PDF viewer, so the Preview action only shows from 768px.
export function useCanPreviewPdf() {
    const query = '(min-width: 768px)'
    const [ok, setOk] = useState(() => window.matchMedia(query).matches)
    useEffect(() => {
        const mq = window.matchMedia(query)
        const handler = e => setOk(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])
    return ok
}
