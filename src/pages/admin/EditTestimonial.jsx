import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '../../lib/feedback'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { EditTestimonialSkeleton } from '../../components/Skeleton'
import { useProducts } from '../../lib/ProductsContext'
import { syncConditionsOnApproval } from '../../lib/syncConditions'
import { ArrowLeft, ArrowRight, Eye, Check, X, Trash2, FileText, ImagePlus } from 'lucide-react'
import MoreMenu from '../../components/MoreMenu'
import { useDialog } from '../../lib/useDialog'
import { PDFDownloadButton } from '../../components/PDFDownloadButton'
import PDFPreviewDialog from '../../components/PDFPreviewDialog'
import { useCanPreviewPdf } from '../../lib/useCanPreviewPdf'
import { StatusBadge } from '../../components/TestimonialTable'
import { STATUS_MAP } from '../../lib/status'

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Published' },
    { value: 'unpublished', label: 'Unpublished' },
    { value: 'needs_editing', label: 'Needs Editing' },
    { value: 'rejected', label: 'Rejected' },
]

// History notes are stored as "Status: approved"; show the label the admin
// sees everywhere else ("Status: Published").
function historyNote(note = '') {
    return note.replace(/^Status: (\w+)$/, (m, v) => `Status: ${STATUS_MAP[v]?.label || v}`)
}

export default function EditTestimonial() {
    const toast = useToast()
    const PRODUCTS = useProducts()
    const [CONDITIONS, setConditions] = useState([])
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [saved, setSaved] = useState(false)
    const [conditionInput, setConditionInput] = useState('')
    const [newGalleryImages, setNewGalleryImages] = useState([])
    const [form, setForm] = useState(null)
    const [pendingNav, setPendingNav] = useState(null)
    const [pdfPreview, setPdfPreview] = useState(null)
    const [galleryDrag, setGalleryDrag] = useState(false)
    const canPreviewPdf = useCanPreviewPdf()
    const originalForm = useRef(null)
    const storyRef     = useRef(null)
    // Confirmation dialogs: focus in, Tab trapped, Escape cancels, focus restored.
    const deleteDialogRef = useDialog(confirmDelete, () => { if (!deleting) setConfirmDelete(false) })
    const leaveDialogRef  = useDialog(!!pendingNav, () => setPendingNav(null))

    const isDirty = useCallback(() => {
        if (!form || !originalForm.current) return false
        if (newGalleryImages.length > 0) return true
        return JSON.stringify(form) !== JSON.stringify(originalForm.current)
    }, [form, newGalleryImages])

    // Safe navigate, shows confirmation if dirty
    function safeNavigate(to) {
        if (isDirty()) {
            setPendingNav(to)
        } else {
            navigate(to)
        }
    }

    // Block browser tab close / refresh
    useEffect(() => {
        function handleBeforeUnload(e) {
            if (isDirty()) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isDirty])

    // In-app links (breadcrumb, sidebar, account menu) ask first when there are
    // unsaved edits. BrowserRouter has no route blocker, so catch the click.
    useEffect(() => {
        function onClick(e) {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            const a = e.target.closest?.('a[href]')
            if (!a || a.target === '_blank' || a.hasAttribute('download')) return
            const url = new URL(a.href, window.location.href)
            if (url.origin !== window.location.origin) return
            const to = url.pathname + url.search + url.hash
            if (to === window.location.pathname + window.location.search + window.location.hash) return
            if (!isDirty()) return
            e.preventDefault()
            e.stopPropagation()
            safeNavigate(to)
        }
        document.addEventListener('click', onClick, true)
        return () => document.removeEventListener('click', onClick, true)
    })

    useEffect(() => { fetchTestimonial() }, [id])

    useEffect(() => {
        supabase.from('conditions').select('name').order('name')
            .then(({ data }) => setConditions((data || []).map(d => d.name)))
    }, [])

    async function fetchTestimonial() {
        const { data } = await supabase.from('testimonials').select('*').eq('id', id).single()
        if (data) {
            setForm(data)
            originalForm.current = data
        }
        setLoading(false)
    }

    function update(field, value) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    function addCondition() {
        const val = conditionInput.trim()
        if (val && !form.conditions?.includes(val)) {
            update('conditions', [...(form.conditions || []), val])
        }
        setConditionInput('')
    }

    function removeCondition(c) {
        update('conditions', form.conditions.filter(x => x !== c))
    }

    function toggleProduct(p) {
        const current = form.products || []
        update('products', current.includes(p) ? current.filter(x => x !== p) : [...current, p])
    }

    function formatText(type) {
        const el = storyRef.current
        if (!el) return
        const start = el.selectionStart
        const end   = el.selectionEnd
        const text  = form.story_text || ''
        const sel   = text.slice(start, end)

        let replacement = sel
        if (type === 'bold')   replacement = `**${sel}**`
        if (type === 'italic') replacement = `_${sel}_`
        if (type === 'ul') {
            replacement = sel
                ? sel.split('\n').map(l => `- ${l}`).join('\n')
                : '- '
        }
        if (type === 'ol') {
            replacement = sel
                ? sel.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n')
                : '1. '
        }

        const newText = text.slice(0, start) + replacement + text.slice(end)
        update('story_text', newText)
        // Restore cursor after React re-render
        setTimeout(() => {
            el.focus()
            el.setSelectionRange(start + replacement.length, start + replacement.length)
        }, 0)
    }

    function removeGalleryImage(url) {
        update('gallery_urls', (form.gallery_urls || []).filter(u => u !== url))
    }

    function moveGalleryImage(index, direction) {
        const arr = [...(form.gallery_urls || [])]
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= arr.length) return
        ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
        update('gallery_urls', arr)
    }

    async function uploadImage(file, folder) {
        const ext = file.name.split('.').pop()
        const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('testimonial-images').upload(filename, file)
        if (error) throw error
        const { data } = supabase.storage.from('testimonial-images').getPublicUrl(filename)
        return data.publicUrl
    }

    function handleGalleryFiles(files) {
        const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
        if (!valid.length) return
        // Preview immediately
        const previews = valid.map(f => URL.createObjectURL(f))
        update('gallery_urls', [...(form.gallery_urls || []), ...previews])
        setNewGalleryImages(prev => [...prev, ...valid])
    }

    function handleDrop(e) {
        e.preventDefault()
        handleGalleryFiles(e.dataTransfer.files)
    }

    async function handleSave() {
        setSaving(true)
        try {
            let updates = { ...form }

            if (newGalleryImages.length > 0) {
                const newUrls = await Promise.all(newGalleryImages.map(f => uploadImage(f, 'gallery')))
                // Replace blob preview URLs with real uploaded URLs
                const blobPreviews = newGalleryImages.map(f => {
                    // Find matching blob URL in gallery_urls by matching file order
                    return null
                })
                const existing = (updates.gallery_urls || []).filter(u => !u.startsWith('blob:'))
                updates.gallery_urls = [...existing, ...newUrls]
            }

            const historyEntry = { at: new Date().toISOString(), note: `Status: ${updates.status}` }
            updates.edit_history = [...(form.edit_history || []), historyEntry]

            delete updates.id

            const { error } = await supabase.from('testimonials').update(updates).eq('id', id)
            if (error) throw error
            if (updates.status === 'approved') {
                await syncConditionsOnApproval(updates.conditions || [])
            }

            setSaved(true)
            setNewGalleryImages([])
            originalForm.current = { ...updates, id, created_at: form.created_at }
            setTimeout(() => setSaved(false), 3000)
            fetchTestimonial()
        } catch (err) {
            toast.error('Your changes could not be saved. Check your connection and try again.')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete() {
        setDeleting(true)
        const { error } = await supabase.from('testimonials').delete().eq('id', id)
        if (error) {
            toast.error('The testimonial could not be deleted. Try again in a moment.')
            setDeleting(false)
            return
        }
        navigate('/admin/all')
    }

    if (loading) return <EditTestimonialSkeleton />
    if (!form) return <div className="admin-page-content"><p>Testimonial not found.</p></div>

    const saveLabel = saving ? 'Saving…' : saved ? <><Check size={16} aria-hidden="true" /> Saved</> : 'Save changes'
    const dirty = isDirty()
    const authorName = form.anonymous ? 'Anonymous' : (form.person_name || 'Unnamed')
    const submitted = form.created_at
        ? new Date(form.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
        : null

    function discardChanges() {
        form.gallery_urls?.forEach(u => { if (u.startsWith('blob:')) URL.revokeObjectURL(u) })
        setForm({ ...originalForm.current })
        setNewGalleryImages([])
    }

    return (
        <div className="admin-page-content">
            {/* Page header: title + meta, then Preview, Save, More (Download PDF, Delete). Back lives in the breadcrumb. */}
            <div className="edit-header">
                <div className="edit-header-title">
                    <h1>Edit Testimonial</h1>
                    <div className="edit-header-meta">
                        <StatusBadge status={originalForm.current?.status || form.status} />
                        <span>{authorName}</span>
                        {submitted && <><span aria-hidden="true">·</span><span>Submitted {submitted}</span></>}
                    </div>
                </div>
                <div className="edit-header-actions">
                    <Link to={`/testimonial/${form.slug || id}`} target="_blank" className="btn-secondary">
                        <Eye size={16} aria-hidden="true" /> Preview
                    </Link>
                    <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>{saveLabel}</button>
                    <MoreMenu label="More actions for this testimonial">
                        {canPreviewPdf && (
                            <button type="button" role="menuitem" onClick={() => setPdfPreview({ ...form })}>
                                <FileText size={16} aria-hidden="true" /> Preview PDF
                            </button>
                        )}
                        <PDFDownloadButton testimonial={form} variant="menuitem" />
                        <hr />
                        <button type="button" role="menuitem" className="danger" onClick={() => setConfirmDelete(true)}>
                            <Trash2 size={16} aria-hidden="true" /> Delete testimonial
                        </button>
                    </MoreMenu>
                </div>
            </div>

            <div className="edit-grid">
                {/* LEFT COLUMN */}
                <div className="edit-main">
                    <div className="edit-section">
                        <label className="edit-label" htmlFor="edit-title">Title</label>
                        <input id="edit-title" className="edit-input" value={form.title || ''} onChange={e => update('title', e.target.value)} placeholder="e.g. Energy back after six weeks on PLUS" />
                    </div>

                    <div className="edit-section">
                        <label className="edit-label" htmlFor="edit-author">Author Name</label>
                        <div className="edit-row">
                            <input id="edit-author" className="edit-input" value={form.person_name || ''} onChange={e => update('person_name', e.target.value)} disabled={form.anonymous} placeholder={form.anonymous ? 'Anonymous submission' : 'Author name'} />
                            <label className="edit-checkbox-label">
                                <input type="checkbox" checked={form.anonymous || false} onChange={e => update('anonymous', e.target.checked)} />
                                Anonymous
                            </label>
                        </div>
                    </div>

                    <div className="edit-section">
                        <label className="edit-label" htmlFor="story-text">Testimonial</label>
                        <div className="rte">
                            <div className="rte-tools" role="toolbar" aria-label="Formatting" aria-controls="story-text">
                                <button type="button" onClick={() => formatText('bold')} aria-label="Bold" title="Bold"><strong>B</strong></button>
                                <button type="button" onClick={() => formatText('italic')} aria-label="Italic" title="Italic"><em>I</em></button>
                                <span className="rte-sep" aria-hidden="true" />
                                <button type="button" onClick={() => formatText('ul')} aria-label="Bullet list" title="Bullet list">• List</button>
                                <button type="button" onClick={() => formatText('ol')} aria-label="Numbered list" title="Numbered list">1. List</button>
                            </div>
                            <textarea
                                id="story-text"
                                placeholder="Write or paste the testimonial here. Select text and use the buttons above for bold, italic or lists."
                                ref={storyRef}
                                className="rte-area"
                                value={form.story_text || ''}
                                onChange={e => update('story_text', e.target.value)}
                                rows={12}
                            />
                            <div className="rte-foot" aria-live="polite">
                                <span>{(form.story_text || '').trim().split(/\s+/).filter(Boolean).length} words</span>
                                <span>{(form.story_text || '').length} characters</span>
                            </div>
                        </div>
                    </div>

                    <fieldset className="edit-section">
                        <legend className="edit-label">Health Conditions</legend>
                        <div className="products-grid">
                            {CONDITIONS.map(c => (
                                <label key={c} className={`product-option ${(form.conditions || []).includes(c) ? 'selected' : ''}`}>
                                    <input type="checkbox" checked={(form.conditions || []).includes(c)} onChange={() => {
                                        const current = form.conditions || []
                                        update('conditions', current.includes(c) ? current.filter(x => x !== c) : [...current, c])
                                    }} />
                                    <Check size={14} className="tick" aria-hidden="true" />
                                    {c}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className="edit-section">
                        <legend className="edit-label">Products</legend>
                        <div className="products-grid">
                            {PRODUCTS.map(p => (
                                <label key={p} className={`product-option ${(form.products || []).includes(p) ? 'selected' : ''}`}>
                                    <input type="checkbox" checked={(form.products || []).includes(p)} onChange={() => toggleProduct(p)} />
                                    <Check size={14} className="tick" aria-hidden="true" />
                                    {p}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>

                {/* RIGHT COLUMN */}
                <div className="edit-sidebar">
                    <div className="edit-section">
                        <label className="edit-label" htmlFor="edit-status">Status</label>
                        <select id="edit-status" className="edit-select" value={form.status} onChange={e => update('status', e.target.value)}>
                            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    <div className="edit-section">
                        <h2 className="edit-label">Gallery Photos</h2>
                        {(form.gallery_urls || []).length > 0 && (
                            <div className="gallery-manage">
                                {(form.gallery_urls || []).map((url, i) => (
                                    <div key={url} className="gallery-manage-item">
                                        <img src={url} alt={`Gallery ${i + 1}`} />
                                        <div className="gallery-overlay-actions">
                                            <button
                                                type="button"
                                                className="gallery-overlay-btn"
                                                onClick={() => moveGalleryImage(i, -1)}
                                                disabled={i === 0}
                                                title="Move left"
                                                aria-label={`Move image ${i + 1} left`}
                                            ><ArrowLeft size={18} aria-hidden="true" /></button>
                                            <button
                                                type="button"
                                                className="gallery-overlay-btn remove"
                                                onClick={() => removeGalleryImage(url)}
                                                title="Remove"
                                                aria-label={`Remove image ${i + 1}`}
                                            ><X size={18} aria-hidden="true" /></button>
                                            <button
                                                type="button"
                                                className="gallery-overlay-btn"
                                                onClick={() => moveGalleryImage(i, 1)}
                                                disabled={i === (form.gallery_urls.length - 1)}
                                                title="Move right"
                                                aria-label={`Move image ${i + 1} right`}
                                            ><ArrowRight size={18} aria-hidden="true" /></button>
                                        </div>
                                        {url.startsWith('blob:') && (
                                            <span className="gallery-unsaved-badge">unsaved</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <label
                            className={`dropzone dropzone--sm ${galleryDrag ? 'drag' : ''}`}
                            onDragOver={e => { e.preventDefault(); setGalleryDrag(true) }}
                            onDragLeave={() => setGalleryDrag(false)}
                            onDrop={e => { setGalleryDrag(false); handleDrop(e) }}
                        >
                            <ImagePlus size={24} className="dropzone-icon" aria-hidden="true" />
                            <span className="dropzone-main">Drag photos here or click to browse</span>
                            <span className="dropzone-sub">JPG or PNG · several at once</span>
                            <input
                                id="gallery-file-input"
                                type="file"
                                accept="image/*"
                                multiple
                                className="dropzone-input"
                                onChange={e => handleGalleryFiles(e.target.files)}
                            />
                        </label>
                    </div>

                    <div className="edit-section">
                        <h2 className="edit-label">Edit History</h2>
                        {(form.edit_history || []).length === 0 ? (
                            <p className="edit-meta">No edits yet.</p>
                        ) : (
                            <ol className="timeline" aria-label="Edit history, newest first">
                                {[...(form.edit_history || [])].reverse().map((entry, i) => (
                                    <li key={i} className={`tl-item ${i > 0 ? 'muted' : ''}`}>
                                        <time className="when" dateTime={entry.at}>
                                            {new Date(entry.at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {' · '}
                                            {new Date(entry.at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                                        </time>
                                        <span className="what">{historyNote(entry.note)}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>

                    <div className="edit-section">
                        <label className="edit-label" htmlFor="edit-date">Testimonial Date</label>
                        <input
                            id="edit-date"
                            type="date"
                            className="edit-input"
                            value={form.created_at ? new Date(form.created_at).toISOString().slice(0, 10) : ''}
                            onChange={e => {
                                const d = e.target.value
                                if (d) update('created_at', new Date(d).toISOString())
                            }}
                        />
                        <p className="settings-hint" style={{ marginTop: 6 }}>This is the date shown on the card and testimonial page.</p>
                    </div>
                </div>
            </div>


            {/* PDF preview: uses what is on screen, unsaved edits included */}
            {pdfPreview && <PDFPreviewDialog testimonial={pdfPreview} onClose={() => setPdfPreview(null)} />}

            {/* Delete confirmation modal */}
            {confirmDelete && (
                <div className="modal-backdrop">
                    <div className="modal" ref={deleteDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title">
                        <h3 id="delete-dialog-title">Delete this testimonial?</h3>
                        <p>This will permanently remove <strong>{form.title}</strong> from the database. This cannot be undone.</p>
                        <div className="modal-ft">
                            <button type="button" className="btn-secondary" data-autofocus onClick={() => setConfirmDelete(false)} disabled={deleting}>
                                Cancel
                            </button>
                            <button type="button" className="btn-danger" onClick={handleDelete} disabled={deleting}>
                                {deleting ? 'Deleting…' : 'Yes, delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {(dirty || saving) && (
                <div className="save-bar" role="region" aria-label="Unsaved changes">
                    <span className="save-bar-msg">{saving ? 'Saving your changes…' : 'You have unsaved changes'}</span>
                    <button type="button" className="btn-ghost" onClick={discardChanges} disabled={saving}>Discard</button>
                    <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>{saveLabel}</button>
                </div>
            )}

            {/* Navigation confirmation modal */}
            {pendingNav && (
                <div className="modal-backdrop">
                    <div className="modal" ref={leaveDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="leave-dialog-title">
                        <h3 id="leave-dialog-title">Leave without saving?</h3>
                        <p>You have unsaved changes. If you leave now they will be lost.</p>
                        <div className="modal-ft">
                            <button type="button" className="btn-secondary" data-autofocus onClick={() => setPendingNav(null)}>
                                Stay and keep editing
                            </button>
                            <button type="button" className="btn-danger" onClick={() => { setPendingNav(null); navigate(pendingNav) }}>
                                Leave without saving
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
