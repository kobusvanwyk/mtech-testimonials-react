import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// How many published testimonials carry each condition and product, plus the
// published total. Shared by the navbar menus and the Home quick filters, so
// the query runs once per page load (module-level promise).
let pending = null

function load() {
    if (!pending) {
        pending = supabase
            .from('testimonials')
            .select('conditions, products')
            .eq('status', 'approved')
            .then(({ data, error }) => {
                if (error || !data) { pending = null; return { counts: {}, total: 0 } }
                const counts = {}
                data.forEach(t => {
                    ;(t.conditions || []).forEach(c => { counts[c] = (counts[c] || 0) + 1 })
                    ;(t.products   || []).forEach(p => { counts[p] = (counts[p] || 0) + 1 })
                })
                return { counts, total: data.length }
            })
    }
    return pending
}

export function useTagCounts() {
    const [state, setState] = useState({ counts: {}, total: 0, ready: false })
    useEffect(() => {
        let live = true
        load().then(r => { if (live) setState({ ...r, ready: true }) })
        return () => { live = false }
    }, [])
    return state
}
