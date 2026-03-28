import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, MinusCircle, Trash2, Eye, Pencil, X, Flag, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { PDFDownloadButton } from './PDFDownloadButton'
import { useProducts } from '../lib/ProductsContext'
import { supabase } from '../lib/supabase'

function QuickViewPanel({ t, onStatusChange, onQuickSave, onClose }) {
    const ALL_PRODUCTS   = useProducts()
    const [ALL_CONDITIONS, setAllConditions] = useState([])

    useEffect(() => {
        supabase.from('conditions').select('name').order('name')
            .then(({ data }) => setAllConditions((data || []).map(d => d.name)))
    }, [])

    const [title,      setTitle]      = useState(t.title || '')
    const [personName, setPersonName] = useState(t.person_name || '')
    const [anonymous,  setAnonymous]  = useState(t.anonymous || false)
    const [conditions, setConditions] = useState(t.conditions || [])
    const [products,   setProducts]   = useState(t.products || [])
    const [saving,     setSaving]     = useState(false)
    const [saved,      setSaved]      = useState(false)

    function toggleCondition(c) {
        setConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
    }

    function toggleProduct(p) {
        setProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
    }

    async function handleSave() {
        setSaving(true)
        await onQuickSave(t.id, { title, person_name: personName, anonymous, conditions, products })
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <tr className="quick-view-row">
            <td colSpan={8}>
                <div className="quick-view-panel">

                    {/* ── Story ── */}
                    <div className="qv-story">
                        <div className="qv-section-label">Story</div>
                        <p className="qv-story-text">{t.story_text || <em>No story text.</em>}</p>
                    </div>

                    {/* ── Editable fields ── */}
                    <div className="qv-fields">
                        <div className="qv-field">
                            <label className="qv-label">Title</label>
                            <input className="qv-input" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div className="qv-field">
                            <label className="qv-label">Author</label>
                            <div className="qv-author-row">
                                <input
                                    className="qv-input"
                                    value={personName}
                                    onChange={e => setPersonName(e.target.value)}
                                    disabled={anonymous}
                                    placeholder={anonymous ? 'Anonymous' : 'Author name'}
                                />
                                <label className="qv-anon-toggle">
                                    <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} />
                                    Anonymous
                                </label>
                            </div>
                        </div>
                        <div className="qv-field">
                            <label className="qv-label">Conditions</label>
                            <div className="qv-products">
                                {ALL_CONDITIONS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`qv-product-btn ${conditions.includes(c) ? 'on' : ''}`}
                                        onClick={() => toggleCondition(c)}
                                    >{c}</button>
                                ))}
                            </div>
                        </div>
                        <div className="qv-field qv-field-full">
                            <label className="qv-label">Products</label>
                            <div className="qv-products">
                                {ALL_PRODUCTS.map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`qv-product-btn ${products.includes(p) ? 'on' : ''}`}
                                        onClick={() => toggleProduct(p)}
                                    >{p}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Actions ── */}
                    <div className="qv-actions">
                        <button className="qv-btn save" onClick={handleSave} disabled={saving}>
                            <Save size={13} /> {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        {t.status !== 'approved' && (
                            <button className="qv-btn publish" onClick={() => onStatusChange(t.id, 'approved')}>
                                <Check size={13} /> Publish
                            </button>
                        )}
                        {t.status === 'approved' && (
                            <button className="qv-btn unpublish" onClick={() => onStatusChange(t.id, 'unpublished')}>
                                <MinusCircle size={13} /> Unpublish
                            </button>
                        )}
                        <Link to={`/admin/edit/${t.id}`} className="qv-btn edit">
                            <Pencil size={13} /> Full Edit
                        </Link>
                        <button className="qv-btn close" onClick={onClose}>
                            <X size={13} /> Close
                        </button>
                    </div>

                </div>
            </td>
        </tr>
    )
}

export default function TestimonialTable({ testimonials, onStatusChange, onDelete, onQuickSave, loading }) {
    const [selected,   setSelected]   = useState([])
    const [search,     setSearch]     = useState('')
    const [expandedId, setExpandedId] = useState(null)

    const statusBadge = (status) => {
        const map = {
            pending: { label: 'Pending', cls: 'badge-pending' },
            approved: { label: 'Published', cls: 'badge-approved' },
            unpublished: { label: 'Unpublished', cls: 'badge-unpublished' },
            needs_editing: { label: 'Needs Editing', cls: 'badge-needs-editing' },
            rejected: { label: 'Rejected', cls: 'badge-rejected' },
        }
        const s = map[status] || { label: status, cls: '' }
        return <span className={`status-badge ${s.cls}`}>{s.label}</span>
    }

    const filtered = testimonials.filter(t => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
            t.title?.toLowerCase().includes(q) ||
            t.person_name?.toLowerCase().includes(q) ||
            t.conditions?.some(c => c.toLowerCase().includes(q)) ||
            t.products?.some(p => p.toLowerCase().includes(q))
        )
    })

    function toggleSelect(id) {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    function toggleAll() {
        setSelected(selected.length === filtered.length ? [] : filtered.map(t => t.id))
    }

    if (loading) return <div className="loading">Loading...</div>

    return (
        <div className="testimonial-table-wrap">
            <div className="table-toolbar">
                <input
                    type="text"
                    placeholder="Search by title, name, condition or product..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="table-search"
                />
                {selected.length > 0 && (
                    <div className="bulk-actions">
                        <span className="bulk-count">{selected.length} selected</span>
                        <button className="btn-bulk-approve"   onClick={() => { selected.forEach(id => onStatusChange(id, 'approved'));   setSelected([]) }}><Check size={14} /> Publish All</button>
                        <button className="btn-bulk-unpublish" onClick={() => { selected.forEach(id => onStatusChange(id, 'unpublished')); setSelected([]) }}><MinusCircle size={14} /> Unpublish All</button>
                        <button className="btn-bulk-delete"    onClick={() => { if (window.confirm(`Delete ${selected.length} testimonials?`)) { selected.forEach(id => onDelete(id)); setSelected([]) } }}><Trash2 size={14} /> Delete All</button>
                    </div>
                )}
            </div>

            {filtered.length === 0 ? (
                <p className="table-empty">No testimonials found.</p>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" onChange={toggleAll} checked={selected.length === filtered.length && filtered.length > 0} /></th>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Conditions</th>
                            <th>Products</th>
                            <th>Imgs</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(t => (
                            <>
                            <tr key={t.id} className={`${selected.includes(t.id) ? 'row-selected' : ''} ${expandedId === t.id ? 'row-expanded' : ''}`}>
                                <td><input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                                <td className="col-title">
                                    <Link to={`/admin/edit/${t.id}`}>{t.title}</Link>
                                    {t.is_imported && (
                                        <span className="badge-imported" title={`Imported from: ${t.imported_from}`}>
                                            imported
                                        </span>
                                    )}
                                </td>
                                <td>{t.anonymous ? <em>Anonymous</em> : t.person_name}</td>
                                <td className="col-tags"><div className="tags-wrap">{t.conditions?.map(c => <span key={c} className="tag tag-condition">{c}</span>)}</div></td>
                                <td className="col-tags"><div className="tags-wrap">{t.products?.map(p => <span key={p} className="tag tag-product">{p}</span>)}</div></td>
                                <td className="col-imgs">
                                    {(t.gallery_urls?.length > 0)
                                        ? <span className="img-count-badge" title={`${t.gallery_urls.length} image${t.gallery_urls.length !== 1 ? 's' : ''}`}>🖼 {t.gallery_urls.length}</span>
                                        : <span className="img-count-none">—</span>
                                    }
                                </td>
                                <td className="col-date">
                                    <span>{new Date(t.created_at).toLocaleDateString('en-ZA')}</span>
                                    <span className="col-time">{new Date(t.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
                                </td>
                                <td>{statusBadge(t.status)}</td>
                                <td>
                                    <div className="row-actions">
                                        <button
                                            className={`row-action-btn quick-view ${expandedId === t.id ? 'active' : ''}`}
                                            onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                                            title="Quick view"
                                        >
                                            {expandedId === t.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />} View
                                        </button>
                                        <Link to={`/admin/edit/${t.id}`} className="row-action-btn">Edit</Link>
                                        {t.status !== 'approved' && (
                                            <button className="row-action-btn approve" onClick={() => onStatusChange(t.id, 'approved')}>Publish</button>
                                        )}
                                        {t.status === 'approved' && (
                                            <button className="row-action-btn unpublish" onClick={() => onStatusChange(t.id, 'unpublished')}>Unpublish</button>
                                        )}
                                        <button
                                            className={`row-action-btn flag ${t.status === 'needs_editing' ? 'flag-active' : ''}`}
                                            title={t.status === 'needs_editing' ? 'Unflag' : 'Flag: Needs Editing'}
                                            onClick={() => onStatusChange(t.id, t.status === 'needs_editing' ? 'pending' : 'needs_editing')}
                                        ><Flag size={13} /></button>
                                        <PDFDownloadButton testimonial={t} variant="icon" />
                                        <button className="row-action-btn delete" onClick={() => window.confirm('Delete this testimonial?') && onDelete(t.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                            {expandedId === t.id && (
                                <QuickViewPanel
                                    key={`qv-${t.id}`}
                                    t={t}
                                    onStatusChange={onStatusChange}
                                    onQuickSave={onQuickSave}
                                    onClose={() => setExpandedId(null)}
                                />
                            )}
                            </>
                        ))}
                    </tbody>
                </table>
            )}
            <p className="table-count">{filtered.length} testimonial{filtered.length !== 1 ? 's' : ''}</p>
        </div>
    )
}
