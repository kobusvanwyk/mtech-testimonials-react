import { useState, useEffect, useRef } from 'react'
import Alert from '../../components/Alert'
import { useConfirm, useToast } from '../../lib/feedback'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { optimiseImage } from '../../lib/imageTools'
import {
    LayoutGrid, AlignJustify, RefreshCw, Upload,
    Trash2, RefreshCcw, Link2, ExternalLink, Check, FileText, ImageOff, CheckCircle2, Minimize2
} from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import { ImageGridSkeleton } from '../../components/Skeleton'
import MoreMenu from '../../components/MoreMenu'
import OptimisePhotosDialog from '../../components/OptimisePhotosDialog'

const BUCKET = 'testimonial-images'

function formatBytes(bytes) {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(dateStr) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ImageManager() {
    const confirm = useConfirm()
    const toast = useToast()
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('grid')
    const [filter, setFilter] = useState('all')
    const [sort, setSort] = useState('date')
    const [selected, setSelected] = useState(new Set())
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [replacingId, setReplacingId] = useState(null)
    const [copiedId, setCopiedId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [uploadedUrl, setUploadedUrl] = useState(null)
    const [optimising, setOptimising] = useState(false)
    const replaceInputRef = useRef(null)
    const replaceTargetRef = useRef(null)
    const uploadInputRef = useRef(null)
    const navigate = useNavigate()

    useEffect(() => { loadImages() }, [])

    async function handleUpload(e) {
        const file = e.target.files[0]
        if (!file) return
        e.target.value = ''
        setUploading(true)
        setUploadedUrl(null)
        try {
            const ext = file.name.split('.').pop()
            const path = `misc/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
            const { error } = await supabase.storage.from(BUCKET).upload(path, file)
            if (error) throw error
            const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
            await navigator.clipboard.writeText(publicUrl)
            setUploadedUrl(publicUrl)
            await loadImages()
        } catch (err) {
            toast.error('The image could not be uploaded. Check the file and try again.')
            console.error(err)
        }
        setUploading(false)
    }

    async function loadImages() {
        setLoading(true)
        try {
            const { data: testimonials } = await supabase
                .from('testimonials')
                .select('id, title, gallery_urls, status')

            const [{ data: galleryFiles }, { data: miscFiles }] = await Promise.all([
                supabase.storage.from(BUCKET).list('gallery', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } }),
                supabase.storage.from(BUCKET).list('misc', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } }),
            ])

            const urlMap = {}
            ;(testimonials || []).forEach(t => {
                ;(t.gallery_urls || []).forEach(url => {
                    urlMap[url] = { id: t.id, title: t.title, type: 'gallery', status: t.status }
                })
            })

            const allImages = []

            ;(galleryFiles || []).filter(f => f.name !== '.emptyFolderPlaceholder').forEach(f => {
                const path = `gallery/${f.name}`
                const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
                const testimonial = urlMap[publicUrl] || null
                allImages.push({ id: path, path, name: f.name, url: publicUrl, size: f.metadata?.size || 0, createdAt: f.created_at || f.updated_at, folder: 'gallery', testimonial, orphan: !testimonial })
            })

            ;(miscFiles || []).filter(f => f.name !== '.emptyFolderPlaceholder').forEach(f => {
                const path = `misc/${f.name}`
                const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
                allImages.push({ id: path, path, name: f.name, url: publicUrl, size: f.metadata?.size || 0, createdAt: f.created_at || f.updated_at, folder: 'misc', testimonial: null, orphan: false })
            })

            setImages(allImages)
        } catch (err) {
            console.error('Error loading images:', err)
        }
        setLoading(false)
    }

    const displayed = images
        .filter(img => {
            if (filter === 'gallery') return img.folder === 'gallery'
            if (filter === 'misc') return img.folder === 'misc'
            if (filter === 'orphans') return img.orphan
            return true
        })
        .sort((a, b) => {
            if (sort === 'size') return b.size - a.size
            return new Date(b.createdAt) - new Date(a.createdAt)
        })

    const totalSize = images.reduce((sum, i) => sum + (i.size || 0), 0)
    const orphanCount = images.filter(i => i.orphan).length

    function toggleSelect(id) {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function selectAllOrphans() {
        setSelected(new Set(images.filter(i => i.orphan).map(i => i.id)))
        setFilter('orphans')
    }

    function clearSelection() { setSelected(new Set()) }

    async function copyUrl(img) {
        await navigator.clipboard.writeText(img.url)
        setCopiedId(img.id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    async function deleteImage(img) {
        const inUse = !img.orphan
        const ok = await confirm({
            title: 'Delete this image?',
            body: inUse
                ? `It is used by “${img.testimonial.title}” and will be removed from that testimonial too. This cannot be undone.`
                : 'No testimonial uses it. This cannot be undone.',
            confirmLabel: 'Delete image',
            tone: 'danger',
        })
        if (!ok) return

        setDeletingId(img.id)
        try {
            await supabase.storage.from(BUCKET).remove([img.path])
            if (inUse) {
                const { data: t } = await supabase.from('testimonials').select('gallery_urls').eq('id', img.testimonial.id).single()
                const updates = {}
                if ((t.gallery_urls || []).includes(img.url)) updates.gallery_urls = t.gallery_urls.filter(u => u !== img.url)
                if (Object.keys(updates).length > 0) await supabase.from('testimonials').update(updates).eq('id', img.testimonial.id)
            }
            setImages(prev => prev.filter(i => i.id !== img.id))
            setSelected(prev => { const n = new Set(prev); n.delete(img.id); return n })
        } catch (err) {
            toast.error('The image could not be deleted. Try again in a moment.')
            console.error(err)
        }
        setDeletingId(null)
    }

    async function bulkDelete() {
        const toDelete = images.filter(i => selected.has(i.id))
        const inUseCount = toDelete.filter(i => !i.orphan).length
        const n = toDelete.length
        const ok = await confirm({
            title: `Delete ${n} image${n !== 1 ? 's' : ''}?`,
            body: inUseCount > 0
                ? `${inUseCount} ${inUseCount !== 1 ? 'are' : 'is'} still used by testimonials and will be removed from them. This cannot be undone.`
                : 'None of them are used by a testimonial. This cannot be undone.',
            confirmLabel: `Delete ${n}`,
            tone: 'danger',
        })
        if (!ok) return

        setBulkDeleting(true)
        try {
            await supabase.storage.from(BUCKET).remove(toDelete.map(i => i.path))
            for (const img of toDelete.filter(i => !i.orphan)) {
                const { data: t } = await supabase.from('testimonials').select('gallery_urls').eq('id', img.testimonial.id).single()
                const updates = {}
                if ((t.gallery_urls || []).includes(img.url)) updates.gallery_urls = t.gallery_urls.filter(u => u !== img.url)
                if (Object.keys(updates).length > 0) await supabase.from('testimonials').update(updates).eq('id', img.testimonial.id)
            }
            const deletedIds = new Set(toDelete.map(i => i.id))
            setImages(prev => prev.filter(i => !deletedIds.has(i.id)))
            setSelected(new Set())
        } catch (err) {
            toast.error('Some images could not be deleted. Refresh to see what is left.')
            console.error(err)
        }
        setBulkDeleting(false)
    }

    function triggerReplace(img) {
        replaceTargetRef.current = img
        replaceInputRef.current.click()
    }

    async function handleReplaceFile(e) {
        const picked = e.target.files[0]
        if (!picked || !replaceTargetRef.current) return
        const img = replaceTargetRef.current
        e.target.value = ''

        setReplacingId(img.id)
        try {
            const file = await optimiseImage(picked)   // WebP, long edge 2000px
            const ext = file.name.split('.').pop()
            const newPath = `${img.folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
            const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(newPath, file)
            if (uploadErr) throw uploadErr
            const { data: { publicUrl: newUrl } } = supabase.storage.from(BUCKET).getPublicUrl(newPath)

            if (!img.orphan) {
                const { data: t } = await supabase.from('testimonials').select('gallery_urls').eq('id', img.testimonial.id).single()
                const updates = {}
                if ((t.gallery_urls || []).includes(img.url)) updates.gallery_urls = t.gallery_urls.map(u => u === img.url ? newUrl : u)
                if (Object.keys(updates).length > 0) await supabase.from('testimonials').update(updates).eq('id', img.testimonial.id)
            }

            await supabase.storage.from(BUCKET).remove([img.path])
            setImages(prev => prev.map(i => i.id === img.id ? { ...i, id: newPath, path: newPath, name: newPath.split('/').pop(), url: newUrl, createdAt: new Date().toISOString() } : i))
        } catch (err) {
            toast.error('The image could not be replaced. Try again in a moment.')
            console.error(err)
        }
        setReplacingId(null)
        replaceTargetRef.current = null
    }

    // Shared action buttons for both grid and list views
    function ActionButtons({ img, size = 16 }) {
        return (
            <>
                <button className="img-action-btn" onClick={() => triggerReplace(img)} disabled={replacingId === img.id} title="Replace image" aria-label={`Replace ${img.name}`}>
                    <RefreshCcw size={size} />
                </button>
                <button className="img-action-btn" onClick={() => copyUrl(img)} title="Copy URL" aria-label={copiedId === img.id ? 'URL copied' : `Copy URL of ${img.name}`}>
                    {copiedId === img.id ? <Check size={size} /> : <Link2 size={size} />}
                </button>
                <button className="img-action-btn" onClick={() => window.open(img.url, '_blank')} title="Open full size" aria-label={`Open ${img.name} full size`}>
                    <ExternalLink size={size} />
                </button>
                <button className="img-action-btn img-action-delete" onClick={() => deleteImage(img)} disabled={deletingId === img.id} title="Delete image" aria-label={`Delete ${img.name}`}>
                    <Trash2 size={size} />
                </button>
            </>
        )
    }

    if (loading) return <div className="admin-page-content"><ImageGridSkeleton /></div>

    return (
        <div className="admin-page-content">
            <input ref={replaceInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReplaceFile} />
            <input ref={uploadInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />

            <div className="edit-header">
                <h1>Image Manager</h1>
                <div className="edit-header-actions">
                    <button type="button" className="btn-secondary" onClick={loadImages}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
                    <button type="button" className="btn-secondary" onClick={() => setOptimising(true)}><Minimize2 size={16} aria-hidden="true" /> Optimise photos</button>
                    <button type="button" className="btn-primary" onClick={() => uploadInputRef.current.click()} disabled={uploading}>
                        <Upload size={16} aria-hidden="true" /> {uploading ? 'Uploading…' : 'Upload image'}
                    </button>
                </div>
            </div>

            {optimising && (
                <OptimisePhotosDialog
                    images={images}
                    onClose={changed => { setOptimising(false); if (changed) loadImages() }}
                />
            )}

            {uploadedUrl && (
                <Alert
                    type="success"
                    title="Image uploaded, link copied"
                    action={<button type="button" className="btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(uploadedUrl)}><Link2 size={16} aria-hidden="true" /> Copy again</button>}
                    onClose={() => setUploadedUrl(null)}
                >
                    <code className="upload-url">{uploadedUrl}</code>
                </Alert>
            )}
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-number">{images.length}</div><div className="stat-label">Total images</div></div>
                <div className="stat-card"><div className="stat-number">{images.filter(i => i.folder === 'gallery').length}</div><div className="stat-label">Gallery</div></div>
                <div className={`stat-card ${orphanCount > 0 ? 'stat-card--warning' : ''}`}><div className="stat-number">{orphanCount}</div><div className="stat-label">Orphans</div></div>
                <div className="stat-card"><div className="stat-number">{formatBytes(totalSize)}</div><div className="stat-label">Total size</div></div>
            </div>

            {/* Toolbar card: filters and view controls grouped above the grid they control */}
            <div className="toolbar-card">
                <div className="toolbar-card-tabs">
                    <div className="tabs" role="tablist" aria-label="Image filter">
                        {['all', 'gallery', 'misc', 'orphans'].map(f => (
                            <button
                                key={f}
                                type="button"
                                role="tab"
                                aria-selected={filter === f}
                                className={`tab ${filter === f ? 'active' : ''}`}
                                onClick={() => { setFilter(f); clearSelection() }}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                                <span className="count">
                                    {f === 'all' && images.length}
                                    {f === 'gallery' && images.filter(i => i.folder === 'gallery').length}
                                    {f === 'misc' && images.filter(i => i.folder === 'misc').length}
                                    {f === 'orphans' && orphanCount}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="toolbar-card-tools">
                    <span className="toolbar-card-count" aria-live="polite">{displayed.length} image{displayed.length !== 1 ? 's' : ''}</span>
                    <span className="toolbar-card-spacer" />
                    <div className="segmented" role="group" aria-label="View mode">
                        <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={16} aria-hidden="true" /> Grid</button>
                        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><AlignJustify size={16} aria-hidden="true" /> List</button>
                    </div>
                    <select className="tt-select" aria-label="Sort images" value={sort} onChange={e => setSort(e.target.value)}>
                        <option value="date">Newest first</option>
                        <option value="size">Largest first</option>
                    </select>
                    {orphanCount > 0 && (
                        <button type="button" className="btn-secondary" onClick={selectAllOrphans}>
                            Select all orphans ({orphanCount})
                        </button>
                    )}
                </div>
            </div>

            {selected.size > 0 && (
                <div className="img-bulk-bar">
                    <span>{selected.size} image{selected.size !== 1 ? 's' : ''} selected</span>
                    <button className="btn-secondary" onClick={clearSelection}>Clear selection</button>
                    <button className="btn-danger" onClick={bulkDelete} disabled={bulkDeleting}>
                        <Trash2 size={14} /> {bulkDeleting ? 'Deleting…' : 'Delete selected'}
                    </button>
                </div>
            )}

            {displayed.length === 0 ? (
                filter === 'orphans' ? (
                    <EmptyState card tone="success" icon={CheckCircle2} title="No unused images">
                        Every stored image is used by a testimonial, so there is nothing to clean up.
                    </EmptyState>
                ) : (
                    <EmptyState
                        card
                        icon={ImageOff}
                        title="No images here yet"
                        action={filter !== 'all' && <button type="button" className="btn-secondary" onClick={() => setFilter('all')}>Show all images</button>}
                    >
                        Images appear here once they are uploaded with a testimonial or imported from WhatsApp.
                    </EmptyState>
                )
            ) : view === 'grid' ? (
                <div className="img-grid">
                    {displayed.map(img => (
                        <div key={img.id} className={`img-card ${selected.has(img.id) ? 'selected' : ''}`}>
                            <div className="img-card-thumb">
                                <a href={img.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
                                    <img src={img.url} alt="" loading="lazy" />
                                </a>
                                <input
                                    type="checkbox"
                                    className="img-card-check"
                                    checked={selected.has(img.id)}
                                    onChange={() => toggleSelect(img.id)}
                                    aria-label={`Select ${img.name}`}
                                />
                                <span className="img-card-ovl">
                                    {img.folder === 'misc'
                                        ? <span className="status-badge">Misc</span>
                                        : <span className="status-badge badge-info">Gallery</span>}
                                    {img.orphan && <span className="status-badge badge-warning">Orphan</span>}
                                </span>
                                {(replacingId === img.id || deletingId === img.id) && (
                                    <div className="img-card-overlay">{replacingId === img.id ? 'Replacing…' : 'Deleting…'}</div>
                                )}
                            </div>
                            <div className="img-card-info">
                                <div className="img-card-name" title={img.name}>{img.name}</div>
                                <div className="img-card-meta">{formatBytes(img.size)} · {formatDate(img.createdAt)}</div>
                                {img.testimonial ? (
                                    <button className="img-testimonial-link" onClick={() => navigate(`/admin/edit/${img.testimonial.id}`)} title={img.testimonial.title}>
                                        <FileText size={12} aria-hidden="true" /> {img.testimonial.title}
                                    </button>
                                ) : (
                                    <span className="img-no-testimonial">Not used</span>
                                )}
                            </div>
                            <div className="img-card-actions">
                                <ActionButtons img={img} size={15} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="it">
                    <table role="table" aria-label="Images">
                        <thead>
                            <tr role="row">
                                <th role="columnheader" className="c-sel">
                                    <input
                                        type="checkbox"
                                        aria-label="Select all images shown"
                                        checked={displayed.length > 0 && displayed.every(i => selected.has(i.id))}
                                        onChange={() => displayed.every(i => selected.has(i.id)) ? clearSelection() : setSelected(new Set(displayed.map(i => i.id)))}
                                    />
                                </th>
                                <th role="columnheader" className="c-main">Image &amp; testimonial</th>
                                <th role="columnheader" className="c-type">Type</th>
                                <th role="columnheader" className="c-size">Size</th>
                                <th role="columnheader" className="c-date">Uploaded</th>
                                <th role="columnheader" className="c-acts"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map(img => {
                                const typeBadge = (
                                    img.folder === 'misc'
                                        ? <span className="status-badge">Misc</span>
                                        : <span className="status-badge badge-info">Gallery</span>
                                )
                                return (
                                    <tr role="row" key={img.id} className={`${selected.has(img.id) ? 'is-selected' : ''} ${img.orphan ? 'is-orphan' : ''}`}>
                                        <td role="cell" className="c-sel">
                                            <input type="checkbox" checked={selected.has(img.id)} onChange={() => toggleSelect(img.id)} aria-label={`Select ${img.name}`} />
                                        </td>
                                        <td role="cell" className="c-main">
                                            <div className="it-cell">
                                                <img src={img.url} alt="" className="it-thumb" loading="lazy" />
                                                <div className="it-text">
                                                    {img.testimonial ? (
                                                        <Link to={`/admin/edit/${img.testimonial.id}`} className="it-title" title="Open testimonial in editor">{img.testimonial.title}</Link>
                                                    ) : (
                                                        <span className="it-title it-unused">Not used</span>
                                                    )}
                                                    <span className="it-file" title={img.name}>{img.name}</span>
                                                    <div className="it-meta">
                                                        {typeBadge}
                                                        {img.orphan && <span className="status-badge badge-warning">Orphan</span>}
                                                        <span>{formatBytes(img.size)}</span>
                                                        <span>{formatDate(img.createdAt)}</span>
                                                    </div>
                                                    {(replacingId === img.id || deletingId === img.id) && (
                                                        <span className="it-busy">{replacingId === img.id ? 'Replacing…' : 'Deleting…'}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td role="cell" className="c-type">
                                            {typeBadge}
                                            {img.orphan && <span className="status-badge badge-warning">Orphan</span>}
                                        </td>
                                        <td role="cell" className="c-size">{formatBytes(img.size)}</td>
                                        <td role="cell" className="c-date">{formatDate(img.createdAt)}</td>
                                        <td role="cell" className="c-acts">
                                            <div className="it-acts">
                                                <button type="button" className="icon-btn it-wide" onClick={() => copyUrl(img)} aria-label={`Copy link to ${img.name}`}>
                                                    {copiedId === img.id ? <Check size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}
                                                </button>
                                                <button type="button" className="icon-btn it-wide" onClick={() => window.open(img.url, '_blank')} aria-label={`Open ${img.name} full size`}>
                                                    <ExternalLink size={18} aria-hidden="true" />
                                                </button>
                                                <MoreMenu label={`More actions for ${img.name}`}>
                                                    <button type="button" role="menuitem" onClick={() => copyUrl(img)}><Link2 size={16} aria-hidden="true" /> Copy link</button>
                                                    <button type="button" role="menuitem" onClick={() => window.open(img.url, '_blank')}><ExternalLink size={16} aria-hidden="true" /> Open full size</button>
                                                    <button type="button" role="menuitem" onClick={() => triggerReplace(img)} disabled={replacingId === img.id}><RefreshCcw size={16} aria-hidden="true" /> Replace image</button>
                                                    <hr />
                                                    <button type="button" role="menuitem" className="danger" onClick={() => deleteImage(img)} disabled={deletingId === img.id}><Trash2 size={16} aria-hidden="true" /> Delete image</button>
                                                </MoreMenu>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
