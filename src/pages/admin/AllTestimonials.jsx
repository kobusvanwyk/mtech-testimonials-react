import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { syncConditionsOnApproval } from '../../lib/syncConditions'
import TestimonialTable from '../../components/TestimonialTable'
import { List, Download, X, Calendar } from 'lucide-react'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.min.css'

const STATUS_FILTERS = [
    { value: 'all',              label: 'All' },
    { value: 'pending',          label: 'Pending' },
    { value: 'approved',         label: 'Published' },
    { value: 'unpublished',      label: 'Unpublished' },
    { value: 'needs_editing',    label: 'Needs Editing' },
    { value: 'rejected',         label: 'Rejected' },
    { value: 'imported_pending', label: 'Imported Pending' },
    { value: 'imported',         label: 'Imported' },
]

export default function AllTestimonials() {
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [dateFrom, setDateFrom] = useState(null)
    const [dateTo, setDateTo]     = useState(null)
    const dateInputRef = useRef(null)
    const fpRef        = useRef(null)

    useEffect(() => { fetch() }, [])

    useEffect(() => {
        if (!dateInputRef.current) return
        fpRef.current = flatpickr(dateInputRef.current, {
            mode: 'range',
            enableTime: true,
            time_24hr: true,
            dateFormat: 'd M Y H:i',
            placeholder: 'Filter by date range…',
            onChange: (dates) => {
                setDateFrom(dates[0] || null)
                setDateTo(dates[1] || null)
            },
        })
        return () => fpRef.current?.destroy()
    }, [])

    async function fetch() {
        const { data } = await supabase
            .from('testimonials').select('*')
            .order('created_at', { ascending: false })
        setTestimonials(data || [])
        setLoading(false)
    }

    async function handleStatusChange(id, status) {
        await supabase.from('testimonials').update({ status }).eq('id', id)
        if (status === 'approved') {
            const t = testimonials.find(t => t.id === id)
            if (t) await syncConditionsOnApproval(t.conditions || [])
        }
        setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    }

    async function handleQuickSave(id, fields) {
        await supabase.from('testimonials').update(fields).eq('id', id)
        setTestimonials(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t))
    }

    async function handleDelete(id) {
        await supabase.from('testimonials').delete().eq('id', id)
        setTestimonials(prev => prev.filter(t => t.id !== id))
    }

    function exportCSV() {
        const rows = [
            ['Title', 'Author', 'Status', 'Conditions', 'Products', 'Date', 'Words'],
            ...filtered.map(t => [
                `"${(t.title || '').replace(/"/g, '""')}"`,
                `"${(t.anonymous ? 'Anonymous' : t.person_name || '').replace(/"/g, '""')}"`,
                t.status || '',
                `"${(t.conditions || []).join(', ')}"`,
                `"${(t.products || []).join(', ')}"`,
                t.created_at ? new Date(t.created_at).toLocaleDateString('en-ZA') : '',
                (t.story_text || '').trim().split(/\s+/).filter(Boolean).length,
            ])
        ]
        const csv = rows.map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `testimonials-${new Date().toISOString().slice(0,10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const byStatus = statusFilter === 'all'
        ? testimonials
        : statusFilter === 'imported_pending'
            ? testimonials.filter(t => t.is_imported && t.status === 'pending')
            : statusFilter === 'imported'
                ? testimonials.filter(t => t.is_imported)
                : testimonials.filter(t => t.status === statusFilter)

    const filtered = byStatus.filter(t => {
        const created = new Date(t.created_at)
        if (dateFrom && created < dateFrom) return false
        if (dateTo   && created > dateTo)   return false
        return true
    })

    const hasDateFilter = dateFrom || dateTo

    function clearDates() {
        fpRef.current?.clear()
        setDateFrom(null)
        setDateTo(null)
    }

    return (
        <div className="admin-page-content">
            <div className="page-header-row">
                <h2><List size={20} /> All Testimonials</h2>
                <button className="btn-export-csv" onClick={exportCSV}><Download size={15} /> Export CSV</button>
            </div>
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
                                : f.value === 'imported_pending'
                                    ? testimonials.filter(t => t.is_imported && t.status === 'pending').length
                                    : f.value === 'imported'
                                        ? testimonials.filter(t => t.is_imported).length
                                        : testimonials.filter(t => t.status === f.value).length}
                        </span>
                    </button>
                ))}
            </div>
            <div className="date-filter-bar">
                <Calendar size={15} className="date-filter-icon" />
                <input
                    ref={dateInputRef}
                    className="date-filter-input"
                    placeholder="Filter by date &amp; time range…"
                    readOnly
                />
                {hasDateFilter && (
                    <button className="date-filter-clear" onClick={clearDates}>
                        <X size={13} /> Clear
                    </button>
                )}
            </div>
            <TestimonialTable
                testimonials={filtered}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onQuickSave={handleQuickSave}
                loading={loading}
            />
        </div>
    )
}
