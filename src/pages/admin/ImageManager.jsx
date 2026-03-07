import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
    Images, LayoutGrid, AlignJustify, RefreshCw, Upload,
    Trash2, RefreshCcw, Link2, ExternalLink, Check, FileText
} from 'lucide-react'

const BUCKET = 'testimonial-images'

function formatBytes(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ImageManager() {
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
            alert('Upload failed: ' + err.message)
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
        const msg = inUse
            ? `This image is used by "${img.testimonial.title}". Deleting it will also remove it from that testimonial. Continue?`
            : `Delete this orphaned image? This cannot be undone.`
        if (!confirm(msg)) return

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
            alert('Error deleting image.')
            console.error(err)
        }
        setDeletingId(null)
    }

    async function bulkDelete() {
        const toDelete = images.filter(i => selected.has(i.id))
        const inUseCount = toDelete.filter(i => !i.orphan).length
        const msg = inUseCount > 0
            ? `Delete ${toDelete.length} images? ${inUseCount} are still used by testimonials and will be removed from them.`
            : `Delete ${toDelete.length} orphaned images? This cannot be undone.`
        if (!confirm(msg)) return

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
            alert('Error during bulk delete.')
            console.error(err)
        }
        setBulkDeleting(false)
    }

    function triggerReplace(img) {
        replaceTargetRef.current = img
        replaceInputRef.current.click()
    }

    async function handleReplaceFile(e) {
        const file = e.target.files[0]
        if (!file || !replaceTargetRef.current) return
        const img = replaceTargetRef.current
        e.target.value = ''

        setReplacingId(img.id)
        try {
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
            alert('Error replacing image.')
            console.error(err)
        }
        setReplacingId(null)
        replaceTargetRef.current = null
    }

    // Shared action buttons for both grid and list views
    function ActionButtons({ img, size = 16 }) {
        return (
            <>
                <button className="img-action-btn" onClick={() => triggerReplace(img)} disabled={replacingId === img.id} title="Replace image">
                    <RefreshCcw size={size} />
                </button>
                <button className="img-action-btn" onClick={() => copyUrl(img)} title="Copy URL">
                    {copiedId === img.id ? <Check size={size} /> : <Link2 size={size} />}
                </button>
                <button className="img-action-btn" onClick={() => window.open(img.url, '_blank')} title="Open full size">
                    <ExternalLink size={size} />
                </button>
                <button className="img-action-btn img-action-delete" onClick={() => deleteImage(img)} disabled={deletingId === img.id} title="Delete image">
                    <Trash2 size={size} />
                </button>
            </>
        )
    }

    if (loading) return <div className="admin-page-content"><div className="loading">Loading images…</div></div>

    return (
        <div className="admin-page-content">
            <input ref={replaceInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReplaceFile} />
            <input ref={uploadInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />

            <div className="edit-header">
                <h2><Images size={20} /> Image Manager</h2>
                <div className="edit-header-actions">
                    <button className={`btn-icon ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} title="Grid view"><LayoutGrid size={16} /></button>
                    <button className={`btn-icon ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} title="List view"><AlignJustify size={16} /></button>
                    <button className="btn-secondary" onClick={loadImages}><RefreshCw size={14} /> Refresh</button>
                    <button className="btn-primary" onClick={() => uploadInputRef.current.click()} disabled={uploading}>
                        <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Image'}
                    </button>
                </div>
            </div>

            {uploadedUrl && (
                <div className="upload-success-banner">
                    <Check size={15} />
                    <span>Uploaded! URL copied to clipboard:</span>
                    <code className="upload-url">{uploadedUrl}</code>
                    <button className="img-action-btn" onClick={() => navigator.clipboard.writeText(uploadedUrl)} title="Copy again"><Link2 size={13} /></button>
                    <button className="upload-banner-close" onClick={() => setUploadedUrl(null)}>×</button>
                </div>
            )}
            <div className="img-stats-bar">
                <div className="img-stat"><span className="img-stat-value">{images.length}</span><span className="img-stat-label">Total Images</span></div>
                <div className="img-stat"><span className="img-stat-value">{images.filter(i => i.folder === 'gallery').length}</span><span className="img-stat-label">Gallery</span></div>
                <div className={`img-stat ${orphanCount > 0 ? 'img-stat-warn' : ''}`}><span className="img-stat-value">{orphanCount}</span><span className="img-stat-label">Orphans</span></div>
                <div className="img-stat"><span className="img-stat-value">{formatBytes(totalSize)}</span><span className="img-stat-label">Total Size</span></div>
            </div>

            <div className="img-toolbar">
                <div className="img-filter-tabs">
                    {['all', 'gallery', 'misc', 'orphans'].map(f => (
                        <button key={f} className={`img-filter-tab ${filter === f ? 'active' : ''}`} onClick={() => { setFilter(f); clearSelection() }}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            <span className="img-filter-count">
                                {f === 'all' && images.length}
                                {f === 'gallery' && images.filter(i => i.folder === 'gallery').length}
                                {f === 'misc' && images.filter(i => i.folder === 'misc').length}
                                {f === 'orphans' && orphanCount}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="img-toolbar-right">
                    <select className="img-sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                        <option value="date">Sort: Newest first</option>
                        <option value="size">Sort: Largest first</option>
                    </select>
                    {orphanCount > 0 && (
                        <button className="btn-warn-outline" onClick={selectAllOrphans}>
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

            <p className="results-count">{displayed.length} image{displayed.length !== 1 ? 's' : ''}</p>

            {displayed.length === 0 ? (
                <p className="no-results">No images found.</p>
            ) : view === 'grid' ? (
                <div className="img-grid">
                    {displayed.map(img => (
                        <div key={img.id} className={`img-card ${selected.has(img.id) ? 'selected' : ''} ${img.orphan ? 'orphan' : ''}`}>
                            <div className="img-card-check">
                                <input type="checkbox" checked={selected.has(img.id)} onChange={() => toggleSelect(img.id)} />
                            </div>
                            <div className="img-card-thumb" onClick={() => window.open(img.url, '_blank')}>
                                <img src={img.url} alt={img.name} loading="lazy" />
                                {(replacingId === img.id || deletingId === img.id) && (
                                    <div className="img-card-overlay">{replacingId === img.id ? 'Replacing…' : 'Deleting…'}</div>
                                )}
                            </div>
                            <div className="img-card-info">
                                <div className="img-card-badges">
                                    <span className={`img-type-badge img-type-${img.folder}`}>
                                        {img.folder === 'misc' ? <><Upload size={11} /> Misc</> : <><Images size={11} /> Gallery</>}
                                    </span>
                                    {img.orphan && <span className="img-orphan-badge">Orphan</span>}
                                </div>
                                <div className="img-card-name" title={img.name}>{img.name}</div>
                                <div className="img-card-meta">{formatBytes(img.size)} · {formatDate(img.createdAt)}</div>
                                {img.testimonial ? (
                                    <button className="img-testimonial-link" onClick={() => navigate(`/admin/edit/${img.testimonial.id}`)} title="Open testimonial in editor">
                                        <FileText size={12} /> {img.testimonial.title}
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
                <table className="img-list-table">
                    <thead>
                        <tr>
                            <th style={{ width: 36 }}></th>
                            <th style={{ width: 60 }}>Preview</th>
                            <th>File</th>
                            <th>Type</th>
                            <th>Size</th>
                            <th>Uploaded</th>
                            <th>Testimonial</th>
                            <th style={{ width: 140 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayed.map(img => (
                            <tr key={img.id} className={`${selected.has(img.id) ? 'selected' : ''} ${img.orphan ? 'orphan-row' : ''}`}>
                                <td><input type="checkbox" checked={selected.has(img.id)} onChange={() => toggleSelect(img.id)} /></td>
                                <td><img src={img.url} alt="" className="img-list-thumb" onClick={() => window.open(img.url, '_blank')} /></td>
                                <td>
                                    <div className="img-list-name" title={img.name}>{img.name}</div>
                                    {img.orphan && <span className="img-orphan-badge">Orphan</span>}
                                </td>
                                <td>
                                    <span className={`img-type-badge img-type-${img.folder}`}>
                                        {img.folder === 'misc' ? <><Upload size={11} /> Misc</> : <><Images size={11} /> Gallery</>}
                                    </span>
                                </td>
                                <td className="img-list-size">{formatBytes(img.size)}</td>
                                <td className="img-list-date">{formatDate(img.createdAt)}</td>
                                <td>
                                    {img.testimonial ? (
                                        <button className="img-testimonial-link" onClick={() => navigate(`/admin/edit/${img.testimonial.id}`)}>
                                            <FileText size={12} /> {img.testimonial.title}
                                        </button>
                                    ) : (
                                        <span className="img-no-testimonial">Not used</span>
                                    )}
                                </td>
                                <td>
                                    <div className="img-list-actions">
                                        <ActionButtons img={img} size={14} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}
