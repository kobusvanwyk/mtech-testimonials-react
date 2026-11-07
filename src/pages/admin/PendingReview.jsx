import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { syncConditionsOnApproval } from '../../lib/syncConditions'
import { importSource } from '../../lib/status'
import { plainStory } from '../../lib/storyText'
import Avatar from '../../components/Avatar'
import { ReviewSkeleton } from '../../components/Skeleton'
import { Check, X, PencilLine, Flag, ImageIcon, CheckCircle2, ChevronDown, RotateCcw, FileText } from 'lucide-react'
import PDFPreviewDialog from '../../components/PDFPreviewDialog'
import EmptyState from '../../components/EmptyState'
import { useCanPreviewPdf } from '../../lib/useCanPreviewPdf'

// Pending Review: a focused queue of new submissions. Each card carries what is
// needed to decide (story, tags, photos, source) and the three decisions.
// Decisions remove the card and raise a toast with Undo.

const DECISIONS = {
    approved:      { verb: 'Published',            tone: 'success' },
    needs_editing: { verb: 'Marked needs editing', tone: 'warning' },
    rejected:      { verb: 'Rejected',             tone: 'error' },
}


function formatDate(iso) {
    return iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

function notifyCountChanged() {
    window.dispatchEvent(new Event('admin:pending-changed'))
}

function ReviewCard({ t, busy, onDecide, onPreviewPdf }) {
    const [expanded, setExpanded] = useState(false)
    const story = plainStory(t.story_text)
    const long = story.length > 420
    const name = t.anonymous ? 'Anonymous' : (t.person_name || 'Unnamed')
    const src = importSource(t.imported_from)
    const photos = t.gallery_urls?.length || 0
    const titleId = `review-title-${t.id}`

    return (
        <article className="review-card" aria-labelledby={titleId}>
            <header className="review-card-head">
                <h2 id={titleId} className="review-card-title">{t.title || 'Untitled submission'}</h2>
                <div className="review-card-meta">
                    <Avatar name={name} anonymous={t.anonymous} size="sm" />
                    <span className="review-card-author">{name}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={t.created_at}>{formatDate(t.created_at)}</time>
                    {photos > 0 && (
                        <>
                            <span aria-hidden="true">·</span>
                            <span className="review-card-photos">
                                <ImageIcon size={14} aria-hidden="true" /> {photos} photo{photos !== 1 ? 's' : ''}
                            </span>
                        </>
                    )}
                    {src && (
                        <span className={`badge-source badge-source--${src.cls}`}>
                            <src.Icon size={12} aria-hidden="true" /> {src.label}
                        </span>
                    )}
                </div>
            </header>

            {(t.conditions?.length > 0 || t.products?.length > 0) && (
                <div className="review-card-tags">
                    {t.conditions?.map(c => <span key={`c-${c}`} className="tag tag-condition">{c}</span>)}
                    {t.products?.map(p => <span key={`p-${p}`} className="tag tag-product">{p}</span>)}
                </div>
            )}

            {story && (
                <div className="review-card-story">
                    <p id={`story-${t.id}`} className={expanded || !long ? '' : 'is-clamped'}>{story}</p>
                    {long && (
                        <button
                            type="button"
                            className="review-card-more"
                            aria-expanded={expanded}
                            aria-controls={`story-${t.id}`}
                            onClick={() => setExpanded(v => !v)}
                        >
                            {expanded ? 'Show less' : 'Read the full testimonial'}
                            <ChevronDown size={16} aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}

            <footer className="review-card-actions">
                <button type="button" className="review-act review-act--approve" disabled={busy} onClick={() => onDecide(t, 'approved')}>
                    <Check size={16} aria-hidden="true" /> Approve and publish
                </button>
                <button type="button" className="review-act review-act--edit" disabled={busy} onClick={() => onDecide(t, 'needs_editing')}>
                    <Flag size={16} aria-hidden="true" /> Needs editing
                </button>
                <button type="button" className="review-act review-act--reject" disabled={busy} onClick={() => onDecide(t, 'rejected')}>
                    <X size={16} aria-hidden="true" /> Reject
                </button>
                <div className="review-card-links">
                    {onPreviewPdf && (
                        <button type="button" className="review-card-edit" onClick={() => onPreviewPdf(t)}>
                            <FileText size={16} aria-hidden="true" /> Preview PDF
                        </button>
                    )}
                    <Link to={`/admin/edit/${t.id}`} className="review-card-edit">
                        <PencilLine size={16} aria-hidden="true" /> Edit first
                    </Link>
                </div>
            </footer>
        </article>
    )
}

export default function PendingReview() {
    const [items, setItems]     = useState([])
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId]   = useState(null)
    const [toast, setToast]     = useState(null) // { item, index, status }
    const toastTimer = useRef(null)
    const [pdfPreview, setPdfPreview] = useState(null)
    const canPreviewPdf = useCanPreviewPdf()

    useEffect(() => {
        supabase.from('testimonials').select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true }) // oldest first: first in, first reviewed
            .then(({ data }) => { setItems(data || []); setLoading(false) })
        return () => clearTimeout(toastTimer.current)
    }, [])

    function showToast(next) {
        clearTimeout(toastTimer.current)
        setToast(next)
        toastTimer.current = setTimeout(() => setToast(null), 8000)
    }

    async function decide(t, status) {
        setBusyId(t.id)
        const { error } = await supabase.from('testimonials').update({ status }).eq('id', t.id)
        setBusyId(null)
        if (error) { showToast({ error: `Could not update "${t.title}". Please try again.` }); return }
        if (status === 'approved') await syncConditionsOnApproval(t.conditions || [])
        const index = items.findIndex(i => i.id === t.id)
        setItems(prev => prev.filter(i => i.id !== t.id))
        showToast({ item: t, index, status })
        notifyCountChanged()
    }

    async function undo() {
        if (!toast?.item) return
        const { item, index } = toast
        clearTimeout(toastTimer.current)
        setToast(null)
        const { error } = await supabase.from('testimonials').update({ status: 'pending' }).eq('id', item.id)
        if (error) { showToast({ error: `Could not undo. "${item.title}" is still ${DECISIONS[toast.status].verb.toLowerCase()}.` }); return }
        setItems(prev => {
            const next = [...prev]
            next.splice(Math.min(index, next.length), 0, item)
            return next
        })
        notifyCountChanged()
    }

    return (
        <div className="admin-page-content">
            <h1>Pending Review</h1>
            {pdfPreview && <PDFPreviewDialog testimonial={pdfPreview} onClose={() => setPdfPreview(null)} />}
            <p className="page-sub">
                New submissions waiting for a decision, oldest first. Approving publishes the testimonial on the public site.
            </p>

            {loading ? <ReviewSkeleton cards={3} /> : items.length === 0 ? (
                <EmptyState
                    card
                    tone="success"
                    className="review-empty"
                    icon={CheckCircle2}
                    title="All caught up"
                    action={<Link to="/admin/all" className="btn-secondary">View all testimonials</Link>}
                >
                    There are no submissions waiting for review. New ones will appear here.
                </EmptyState>
            ) : (
                <>
                    <p className="review-count" aria-live="polite">
                        <strong>{items.length}</strong> waiting for review
                    </p>
                    <div className="review-queue">
                        {items.map(t => (
                            <ReviewCard key={t.id} t={t} busy={busyId === t.id} onDecide={decide} onPreviewPdf={canPreviewPdf ? setPdfPreview : null} />
                        ))}
                    </div>
                </>
            )}

            <div className="toast-wrap" role="status" aria-live="polite">
                {toast && (
                    <div className={`toast toast-${toast.error ? 'error' : DECISIONS[toast.status].tone}`}>
                        {toast.error ? <X size={18} className="toast-ic" aria-hidden="true" /> : <Check size={18} className="toast-ic" aria-hidden="true" />}
                        <span className="toast-msg">
                            {toast.error || <>{DECISIONS[toast.status].verb}: <strong>{toast.item.title}</strong></>}
                        </span>
                        {toast.item && (
                            <button type="button" className="toast-action" onClick={undo}>
                                <RotateCcw size={14} aria-hidden="true" /> Undo
                            </button>
                        )}
                        <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => setToast(null)}>
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
