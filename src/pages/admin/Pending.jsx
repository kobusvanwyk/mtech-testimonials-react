import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { syncConditionsOnApproval } from '../../lib/syncConditions'
import PreviewModal from '../../components/PreviewModal'
import { Eye, Check, Flag, Pencil, X, Trash2, ChevronDown, ChevronUp, Undo2, CheckCircle, Clock } from 'lucide-react'

export default function Pending() {
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)
    const [previewing, setPreviewing] = useState(null)

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
        // keep needs_editing items visible, remove others
        if (status === 'needs_editing') {
            setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status } : t))
        } else {
            setTestimonials(prev => prev.filter(t => t.id !== id))
        }
    }

    async function handleDelete(id) {
        await supabase.from('testimonials').delete().eq('id', id)
        setTestimonials(prev => prev.filter(t => t.id !== id))
    }

    const pending = testimonials.filter(t => t.status === 'pending')
    const flagged = testimonials.filter(t => t.status === 'needs_editing')

    if (loading) return <div className="admin-page-content"><div className="loading">Loading...</div></div>

    return (
        <div className="admin-page-content">
            <h2><Clock size={20} /> Pending Review</h2>
            <p className="page-sub">New submissions waiting for your review. Publish, flag for editing, or reject.</p>

            {testimonials.length === 0 && (
                <div className="empty-state"><CheckCircle size={20} /> All caught up! No pending submissions.</div>
            )}

            {flagged.length > 0 && (
                <div className="flagged-section">
                    <h3 className="flagged-heading"><Flag size={16} /> Needs Editing ({flagged.length})</h3>
                    {flagged.map(t => <ReviewCard key={t.id} t={t} onStatus={handleStatus} onDelete={handleDelete} onPreview={setPreviewing} />)}
                </div>
            )}

            {pending.map(t => <ReviewCard key={t.id} t={t} onStatus={handleStatus} onDelete={handleDelete} onPreview={setPreviewing} />)}
            {previewing && <PreviewModal testimonial={previewing} onClose={() => setPreviewing(null)} onPublish={() => { handleStatus(previewing.id, 'approved'); setPreviewing(null) }} />}
        </div>
    )
}

function ReviewCard({ t, onStatus, onDelete, onPreview }) {
    const [expanded, setExpanded] = useState(false)
    const isFlagged = t.status === 'needs_editing'

    return (
        <div className={`review-card ${isFlagged ? 'review-card-flagged' : ''}`}>
            <div className="review-card-header">
                <div>
                    <h3 className="review-card-title">{t.title}</h3>
                    <p className="review-card-meta">
                        {t.anonymous ? 'Anonymous' : t.person_name}
                        {' · '}
                        {new Date(t.created_at).toLocaleDateString('en-ZA')}
                        {isFlagged && <span className="flagged-label"><Flag size={12} /> Needs Editing</span>}
                    </p>
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

            {t.featured_image_url && expanded && (
                <img src={t.featured_image_url} alt="Featured" className="review-image" />
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
