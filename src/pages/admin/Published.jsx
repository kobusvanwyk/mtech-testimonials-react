import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import TestimonialTable from '../../components/TestimonialTable'

export default function Published() {
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetch() }, [])

    async function fetch() {
        const { data } = await supabase
            .from('testimonials').select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
        setTestimonials(data || [])
        setLoading(false)
    }

    async function handleStatusChange(id, status) {
        await supabase.from('testimonials').update({ status }).eq('id', id)
        setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    }

    async function handleDelete(id) {
        await supabase.from('testimonials').delete().eq('id', id)
        setTestimonials(prev => prev.filter(t => t.id !== id))
    }

    return (
        <div className="admin-page-content">
            <h2>✅ Published ({testimonials.length})</h2>
            <p className="page-sub">Live testimonials visible on the public site.</p>
            <TestimonialTable
                testimonials={testimonials}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                loading={loading}
            />
        </div>
    )
}
