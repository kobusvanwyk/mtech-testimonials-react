import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import TestimonialTable from '../../components/TestimonialTable'
import { List } from 'lucide-react'

const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Published' },
    { value: 'unpublished', label: 'Unpublished' },
    { value: 'needs_editing', label: 'Needs Editing' },
    { value: 'rejected', label: 'Rejected' },
]

export default function AllTestimonials() {
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => { fetch() }, [])

    async function fetch() {
        const { data } = await supabase
            .from('testimonials').select('*')
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

    const filtered = statusFilter === 'all'
        ? testimonials
        : testimonials.filter(t => t.status === statusFilter)

    return (
        <div className="admin-page-content">
            <h2><List size={20} /> All Testimonials</h2>
            <div className="status-filter-bar">
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f.value}
                        className={`filter-tab ${statusFilter === f.value ? 'active' : ''}`}
                        onClick={() => setStatusFilter(f.value)}
                    >
                        {f.label}
                        <span className="filter-count">
                            {f.value === 'all'
                                ? testimonials.length
                                : testimonials.filter(t => t.status === f.value).length}
                        </span>
                    </button>
                ))}
            </div>
            <TestimonialTable
                testimonials={filtered}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                loading={loading}
            />
        </div>
    )
}
