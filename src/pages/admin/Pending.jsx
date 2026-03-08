import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { syncConditionsOnApproval } from '../../lib/syncConditions'
import PreviewModal from '../../components/PreviewModal'
import { Eye, Check, Flag, Pencil, X, Trash2, ChevronDown, ChevronUp, Undo2, CheckCircle, Clock, CheckSquare, Square, XCircle } from 'lucide-react'

export default function Pending() {
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)
    const [previewing, setPreviewing] = useState(null)
    const [selected, setSelected] = useState(new Set())
    const [bulkWorking, setBulkWorking] = useState(false)

    useEffect(() => { fetchPending() }, [])

    async function fetchPending() {
        const { data } = await supabase
            .from('testimonials')
            .select('*')
            .in('status', ['pending', 'needs_editing'])
            .order('created_at', { ascending: false })
        setTestimonials(data || [])
        setLoading(false)
    }

    async function handleStatus(id, status) {
        await supabase.from('testimonials').update({ status }).eq('id', id)
        if (status === 'approved') {
            const t = testimonials.find(t => t.id === id)
            if (t) await syncConditionsOnApproval(t.conditions || [])
        }
        if (status === 'needs_editing') {
            setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status } : t))
        } else {
            setTestimonials(prev => prev.filter(t => t.id !== id))
        }
        setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    }

    async function handleDelete(id) {
        await supabase.from('testimonials').delete().eq('id', id)
        setTestimonials(prev => prev.filter(t => t.id !== id))
        setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    }

    function toggleSelect(id) {
        setSelected(prev => {
            const s = new Set(prev)
            s.has(id) ? s.delete(id) : s.add(id)
            return s
        })
    }

    function toggleSelectAll() {
        if (selected.size === pending.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(pending.map(t => t.id)))
        }
    }

    async function bulkAction(status) {
        if (selected.size === 0) return
        if (!window.confirm(`${status === 'approved' ? 'Publish' : 'Reject'} ${selected.size} testimonial(s)?`)) return
        setBulkWorking(true)
        const ids = [...selected]
        await supabase.from('testimonials').update({ status }).in('id', ids)
        if (status === 'approved') {
            const toSync = testimonials.filter(t => ids.includes(t.id))
            for (const t of toSync) await syncConditionsOnApproval(t.conditions || [])
        }
        setTestimonials(prev => prev.filter(t => !ids.includes(t.id)))
        setSelected(new Set())
        setBulkWorking(false)
    }

    const pending = testimonials.filter(t => t.status === 'pending')
    const flagged = testimonials.filter(t => t.status === 'needs_editing')
    const allSelected = pending.length > 0 && selected.size === pending.length

    if (loading) return <div className="admin-page-content"><div className="loading">Loading...</div></div>

    return (
        <div className="admin-page-content">
            <h2><Clock size={20} /> Pending Review</h2>
            <p className="page-sub">New submissions waiting for your review. Publish, flag for editing, or reject.</p>

            {testimonials.length === 0 && (
                <div className="empty-state"><CheckCircle size={20} /> All caught up! No pending submissions.</div>
            )}

            {/* Bulk action bar — only shown when pending items exist */}
            {pending.length > 0 && (
                <div className="bulk-bar">
                    <button className="bulk-select-all" onClick={toggleSelectAll}>
                        {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        {allSelected ? 'Deselect all' : `Select all (${pending.length})`}
                    </button>
                    {selected.size > 0 && (
                        <>
                            <span className="bulk-count">{selected.size} selected</span>
                            <button className="bulk-btn approve" onClick={() => bulkAction('approved')} disabled={bulkWorking}>
                                <Check size={14} /> Publish all
                            </button>
                            <button className="bulk-btn reject" onClick={() => bulkAction('rejected')} disabled={bulkWorking}>
                                <XCircle size={14} /> Reject all
                            </button>
                        </>
                    )}
                </div>
            )}

            {flagged.length > 0 && (
                <div className="flagged-section">
                    <h3 className="flagged-heading"><Flag size={16} /> Needs Editing ({flagged.length})</h3>
                    {flagged.map(t => <ReviewCard key={t.id} t={t} onStatus={handleStatus} onDelete={handleDelete} onPreview={setPreviewing} selected={false} onSelect={null} />)}
                </div>
            )}

            {pending.map(t => (
                <ReviewCard
                    key={t.id} t={t}
                    onStatus={handleStatus} onDelete={handleDelete} onPreview={setPreviewing}
                    selected={selected.has(t.id)} onSelect={toggleSelect}
                />
            ))}
            {previewing && <PreviewModal testimonial={previewing} onClose={() => setPreviewing(null)} onPublish={() => { handleStatus(previewing.id, 'approved'); setPreviewing(null) }} />}
        </div>
    )
}

function ReviewCard({ t, onStatus, onDelete, onPreview, selected, onSelect }) {
    const [expanded, setExpanded] = useState(false)
    const isFlagged = t.status === 'needs_editing'

    return (
        <div className={`review-card ${isFlagged ? 'review-card-flagged' : ''} ${selected ? 'review-card-selected' : ''}`}>
            <div className="review-card-header">
                <div className="review-card-header-left">
                    {onSelect && (
                        <button className="review-checkbox" onClick={() => onSelect(t.id)} title="Select">
                            {selected ? <CheckSquare size={17} className="checked" /> : <Square size={17} />}
                        </button>
                    )}
                    <div>
                        <h3 className="review-card-title">{t.title}</h3>
                        <p className="review-card-meta">
                            {t.anonymous ? 'Anonymous' : t.person_name}
                            {' · '}
                            {new Date(t.created_at).toLocaleDateString('en-ZA')}
                            {isFlagged && <span className="flagged-label"><Flag size={12} /> Needs Editing</span>}
                        </p>
                    </div>
                </div>
                <button className="expand-btn" onClick={() => setExpanded(e => !e)}>
                    {expanded ? <><ChevronUp size={14} /> Collapse</> : <><ChevronDown size={14} /> Expand</>}
                </button>
            </div>

            <div className="review-tags">
                {(t.conditions || []).map(c => <span key={c} className="tag tag-condition">{c}</span>)}
                {(t.products || []).map(p => <span key={p} className="tag tag-product">{p}</span>)}
            </div>

            {expanded && (
                <div className="review-story">{t.story_text}</div>
            )}

            <div className="review-actions">
                <button className="review-btn preview" onClick={() => onPreview(t)}><Eye size={14} /> Preview</button>
                <button className="review-btn approve" onClick={() => onStatus(t.id, 'approved')}><Check size={14} /> Publish</button>
                <button className={`review-btn flag ${isFlagged ? 'flag-active' : ''}`} onClick={() => onStatus(t.id, isFlagged ? 'pending' : 'needs_editing')}>
                    {isFlagged ? <><Undo2 size={14} /> Unflag</> : <><Flag size={14} /> Needs Editing</>}
                </button>
                <Link to={`/admin/edit/${t.id}`} className="review-btn edit"><Pencil size={14} /> Edit</Link>
                <button className="review-btn reject" onClick={() => onStatus(t.id, 'rejected')}><X size={14} /> Reject</button>
                <button className="review-btn delete" onClick={() => window.confirm('Delete permanently?') && onDelete(t.id)}><Trash2 size={14} /></button>
            </div>
        </div>
    )
}
