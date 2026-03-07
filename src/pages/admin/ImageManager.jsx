import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

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
    const [view, setView] = useState('grid') // 'grid' | 'list'
    const [filter, setFilter] = useState('all') // 'all' | 'featured' | 'gallery' | 'orphans'
    const [sort, setSort] = useState('date') // 'date' | 'size'
    const [selected, setSelected] = useState(new Set())
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [replacingId, setReplacingId] = useState(null)
    const [copiedId, setCopiedId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const replaceInputRef = useRef(null)
    const replaceTargetRef = useRef(null)
    const navigate = useNavigate()

    useEffect(() => { loadImages() }, [])

    async function loadImages() {
        setLoading(true)
        try {
            // Load all testimonials for cross-referencing
            const { data: testimonials } = await supabase
                .from('testimonials')
                .select('id, title, featured_image_url, gallery_urls, status')

            // List files in both folders
            const [{ data: featuredFiles }, { data: galleryFiles }] = await Promise.all([
                supabase.storage.from(BUCKET).list('featured', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } }),
                supabase.storage.from(BUCKET).list('gallery', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } }),
            ])

            // Build URL → testimonial lookup map
            const urlMap = {}
            ;(testimonials || []).forEach(t => {
                if (t.featured_image_url) {
                    urlMap[t.featured_image_url] = { id: t.id, title: t.title, type: 'featured', status: t.status }
                }
                ;(t.gallery_urls || []).forEach(url => {
                    urlMap[url] = { id: t.id, title: t.title, type: 'gallery', status: t.status }
                })
            })

            // Build unified image list
            const allImages = []

            ;(featuredFiles || []).filter(f => f.name !== '.emptyFolderPlaceholder').forEach(f => {
                const path = `featured/${f.name}`
                const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
                const testimonial = urlMap[publicUrl] || null
                allImages.push({
                    id: path,
                    path,
                    name: f.name,
                    url: publicUrl,
                    size: f.metadata?.size || 0,
                    createdAt: f.created_at || f.updated_at,
                    folder: 'featured',
                    testimonial,
                    orphan: !testimonial,
                })
            })

            ;(galleryFiles || []).filter(f => f.name !== '.emptyFolderPlaceholder').forEach(f => {
                const path = `gallery/${f.name}`
                const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
                const testimonial = urlMap[publicUrl] || null
                allImages.push({
                    id: path,
                    path,
                    name: f.name,
                    url: publicUrl,
                    size: f.metadata?.size || 0,
                    createdAt: f.created_at || f.updated_at,
                    folder: 'gallery',
                    testimonial,
                    orphan: !testimonial,
                })
            })

            setImages(allImages)
        } catch (err) {
            console.error('Error loading images:', err)
        }
        setLoading(false)
    }

    // Filtered + sorted images
    const displayed = images
        .filter(img => {
            if (filter === 'featured') return img.folder === 'featured'
            if (filter === 'gallery') return img.folder === 'gallery'
            if (filter === 'orphans') return img.orphan
            return true
        })
        .sort((a, b) => {
            if (sort === 'size') return b.size - a.size
            return new Date(b.createdAt) - new Date(a.createdAt)
        })

    // Stats
    const totalSize = images.reduce((sum, i) => sum + (i.size || 0), 0)
    const orphanCount = images.filter(i => i.orphan).length

    // Selection
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

    // Copy URL
    async function copyUrl(img) {
        await navigator.clipboard.writeText(img.url)
        setCopiedId(img.id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    // Delete single
    async function deleteImage(img) {
        const inUse = !img.orphan
        const msg = inUse
            ? `This image is used by "${img.testimonial.title}". Deleting it will also remove it from that testimonial. Continue?`
            : `Delete this orphaned image? This cannot be undone.`
        if (!confirm(msg)) return

        setDeletingId(img.id)
        try {
            await supabase.storage.from(BUCKET).remove([img.path])

            // If in use, clear from testimonial record
            if (inUse) {
                const { data: t } = await supabase
                    .from('testimonials')
                    .select('featured_image_url, gallery_urls')
                    .eq('id', img.testimonial.id)
                    .single()

                const updates = {}
                if (t.featured_image_url === img.url) updates.featured_image_url = null
                if ((t.gallery_urls || []).includes(img.url)) {
                    updates.gallery_urls = t.gallery_urls.filter(u => u !== img.url)
                }
                if (Object.keys(updates).length > 0) {
                    await supabase.from('testimonials').update(updates).eq('id', img.testimonial.id)
                }
            }

            setImages(prev => prev.filter(i => i.id !== img.id))
            setSelected(prev => { const n = new Set(prev); n.delete(img.id); return n })
        } catch (err) {
            alert('Error deleting image.')
            console.error(err)
        }
        setDeletingId(null)
    }

    // Bulk delete
    async function bulkDelete() {
        const toDelete = images.filter(i => selected.has(i.id))
        const inUseCount = toDelete.filter(i => !i.orphan).length
        const msg = inUseCount > 0
            ? `Delete ${toDelete.length} images? ${inUseCount} are still used by testimonials and will be removed from them.`
            : `Delete ${toDelete.length} orphaned images? This cannot be undone.`
        if (!confirm(msg)) return

        setBulkDeleting(true)
        try {
            const paths = toDelete.map(i => i.path)
            await supabase.storage.from(BUCKET).remove(paths)

            // Update any affected testimonials
            const inUse = toDelete.filter(i => !i.orphan)
            for (const img of inUse) {
                const { data: t } = await supabase
                    .from('testimonials')
                    .select('featured_image_url, gallery_urls')
                    .eq('id', img.testimonial.id)
                    .single()
                const updates = {}
                if (t.featured_image_url === img.url) updates.featured_image_url = null
                if ((t.gallery_urls || []).includes(img.url)) {
                    updates.gallery_urls = t.gallery_urls.filter(u => u !== img.url)
                }
                if (Object.keys(updates).length > 0) {
                    await supabase.from('testimonials').update(updates).eq('id', img.testimonial.id)
                }
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

    // Replace image
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

            // Upload new file
            const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(newPath, file)
            if (uploadErr) throw uploadErr

            const { data: { publicUrl: newUrl } } = supabase.storage.from(BUCKET).getPublicUrl(newPath)

            // Update testimonial record if in use
            if (!img.orphan) {
                const { data: t } = await supabase
                    .from('testimonials')
                    .select('featured_image_url, gallery_urls')
                    .eq('id', img.testimonial.id)
                    .single()

                const updates = {}
                if (t.featured_image_url === img.url) updates.featured_image_url = newUrl
                if ((t.gallery_urls || []).includes(img.url)) {
                    updates.gallery_urls = t.gallery_urls.map(u => u === img.url ? newUrl : u)
                }
                if (Object.keys(updates).length > 0) {
                    await supabase.from('testimonials').update(updates).eq('id', img.testimonial.id)
                }
            }

            // Delete old file from storage
            await supabase.storage.from(BUCKET).remove([img.path])

            // Update local state
            setImages(prev => prev.map(i => i.id === img.id ? {
                ...i,
                id: newPath,
                path: newPath,
                name: newPath.split('/').pop(),
                url: newUrl,
                createdAt: new Date().toISOString(),
            } : i))
        } catch (err) {
            alert('Error replacing image.')
            console.error(err)
        }
        setReplacingId(null)
        replaceTargetRef.current = null
    }

    if (loading) return <div className="admin-page-content"><div className="loading">Loading images…</div></div>

    return (
        <div className="admin-page-content">
            {/* Hidden replace input */}
            <input
                ref={replaceInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleReplaceFile}
            />

            {/* Header */}
            <div className="edit-header">
                <h2>🖼️ Image Manager</h2>
                <div className="edit-header-actions">
                    <button
                        className={`btn-icon ${view === 'grid' ? 'active' : ''}`}
                        onClick={() => setView('grid')}
                        title="Grid view"
                    >⊞</button>
                    <button
                        className={`btn-icon ${view === 'list' ? 'active' : ''}`}
                        onClick={() => setView('list')}
                        title="List view"
                    >☰</button>
                    <button className="btn-secondary" onClick={loadImages}>↻ Refresh</button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="img-stats-bar">
                <div className="img-stat">
                    <span className="img-stat-value">{images.length}</span>
                    <span className="img-stat-label">Total Images</span>
                </div>
                <div className="img-stat">
                    <span className="img-stat-value">{images.filter(i => i.folder === 'featured').length}</span>
                    <span className="img-stat-label">Featured</span>
                </div>
                <div className="img-stat">
                    <span className="img-stat-value">{images.filter(i => i.folder === 'gallery').length}</span>
                    <span className="img-stat-label">Gallery</span>
                </div>
                <div className={`img-stat ${orphanCount > 0 ? 'img-stat-warn' : ''}`}>
                    <span className="img-stat-value">{orphanCount}</span>
                    <span className="img-stat-label">Orphans</span>
                </div>
                <div className="img-stat">
                    <span className="img-stat-value">{formatBytes(totalSize)}</span>
                    <span className="img-stat-label">Total Size</span>
                </div>
            </div>

            {/* Filters + sort + bulk actions */}
            <div className="img-toolbar">
                <div className="img-filter-tabs">
                    {['all', 'featured', 'gallery', 'orphans'].map(f => (
                        <button
                            key={f}
                            className={`img-filter-tab ${filter === f ? 'active' : ''}`}
                            onClick={() => { setFilter(f); clearSelection() }}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            <span className="img-filter-count">
                                {f === 'all' && images.length}
                                {f === 'featured' && images.filter(i => i.folder === 'featured').length}
                                {f === 'gallery' && images.filter(i => i.folder === 'gallery').length}
                                {f === 'orphans' && orphanCount}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="img-toolbar-right">
                    <select
                        className="img-sort-select"
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                    >
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

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="img-bulk-bar">
                    <span>{selected.size} image{selected.size !== 1 ? 's' : ''} selected</span>
                    <button className="btn-secondary" onClick={clearSelection}>Clear selection</button>
                    <button
                        className="btn-danger"
                        onClick={bulkDelete}
                        disabled={bulkDeleting}
                    >
                        {bulkDeleting ? 'Deleting…' : `🗑 Delete selected`}
                    </button>
                </div>
            )}

            {/* Results count */}
            <p className="results-count">{displayed.length} image{displayed.length !== 1 ? 's' : ''}</p>

            {displayed.length === 0 ? (
                <p className="no-results">No images found.</p>
            ) : view === 'grid' ? (
                <div className="img-grid">
                    {displayed.map(img => (
                        <div
                            key={img.id}
                            className={`img-card ${selected.has(img.id) ? 'selected' : ''} ${img.orphan ? 'orphan' : ''}`}
                        >
                            <div className="img-card-check">
                                <input
                                    type="checkbox"
                                    checked={selected.has(img.id)}
                                    onChange={() => toggleSelect(img.id)}
                                />
                            </div>

                            <div className="img-card-thumb" onClick={() => window.open(img.url, '_blank')}>
                                <img src={img.url} alt={img.name} loading="lazy" />
                                {(replacingId === img.id || deletingId === img.id) && (
                                    <div className="img-card-overlay">
                                        {replacingId === img.id ? 'Replacing…' : 'Deleting…'}
                                    </div>
                                )}
                            </div>

                            <div className="img-card-info">
                                <div className="img-card-badges">
                                    <span className={`img-type-badge img-type-${img.folder}`}>
                                        {img.folder === 'featured' ? '★ Featured' : '⊞ Gallery'}
                                    </span>
                                    {img.orphan && <span className="img-orphan-badge">Orphan</span>}
                                </div>

                                <div className="img-card-name" title={img.name}>{img.name}</div>
                                <div className="img-card-meta">
                                    {formatBytes(img.size)} · {formatDate(img.createdAt)}
                                </div>

                                {img.testimonial ? (
                                    <button
                                        className="img-testimonial-link"
                                        onClick={() => navigate(`/admin/edit/${img.testimonial.id}`)}
                                        title="Open testimonial in editor"
                                    >
                                        📝 {img.testimonial.title}
                                    </button>
                                ) : (
                                    <span className="img-no-testimonial">Not used</span>
                                )}
                            </div>

                            <div className="img-card-actions">
                                <button
                                    className="img-action-btn"
                                    onClick={() => triggerReplace(img)}
                                    disabled={replacingId === img.id}
                                    title="Replace image"
                                >🔄</button>
                                <button
                                    className="img-action-btn"
                                    onClick={() => copyUrl(img)}
                                    title="Copy URL"
                                >
                                    {copiedId === img.id ? '✓' : '🔗'}
                                </button>
                                <button
                                    className="img-action-btn"
                                    onClick={() => window.open(img.url, '_blank')}
                                    title="Open full size"
                                >↗</button>
                                <button
                                    className="img-action-btn img-action-delete"
                                    onClick={() => deleteImage(img)}
                                    disabled={deletingId === img.id}
                                    title="Delete image"
                                >🗑</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // List view
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
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selected.has(img.id)}
                                        onChange={() => toggleSelect(img.id)}
                                    />
                                </td>
                                <td>
                                    <img
                                        src={img.url}
                                        alt=""
                                        className="img-list-thumb"
                                        onClick={() => window.open(img.url, '_blank')}
                                    />
                                </td>
                                <td>
                                    <div className="img-list-name" title={img.name}>{img.name}</div>
                                    {img.orphan && <span className="img-orphan-badge">Orphan</span>}
                                </td>
                                <td>
                                    <span className={`img-type-badge img-type-${img.folder}`}>
                                        {img.folder === 'featured' ? '★ Featured' : '⊞ Gallery'}
                                    </span>
                                </td>
                                <td className="img-list-size">{formatBytes(img.size)}</td>
                                <td className="img-list-date">{formatDate(img.createdAt)}</td>
                                <td>
                                    {img.testimonial ? (
                                        <button
                                            className="img-testimonial-link"
                                            onClick={() => navigate(`/admin/edit/${img.testimonial.id}`)}
                                        >
                                            📝 {img.testimonial.title}
                                        </button>
                                    ) : (
                                        <span className="img-no-testimonial">Not used</span>
                                    )}
                                </td>
                                <td>
                                    <div className="img-list-actions">
                                        <button
                                            className="img-action-btn"
                                            onClick={() => triggerReplace(img)}
                                            disabled={replacingId === img.id}
                                            title="Replace"
                                        >{replacingId === img.id ? '…' : '🔄'}</button>
                                        <button
                                            className="img-action-btn"
                                            onClick={() => copyUrl(img)}
                                            title="Copy URL"
                                        >{copiedId === img.id ? '✓' : '🔗'}</button>
                                        <button
                                            className="img-action-btn"
                                            onClick={() => window.open(img.url, '_blank')}
                                            title="Open"
                                        >↗</button>
                                        <button
                                            className="img-action-btn img-action-delete"
                                            onClick={() => deleteImage(img)}
                                            disabled={deletingId === img.id}
                                            title="Delete"
                                        >{deletingId === img.id ? '…' : '🗑'}</button>
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
