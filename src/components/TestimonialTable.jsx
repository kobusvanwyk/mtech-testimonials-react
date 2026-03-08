import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, MinusCircle, Trash2, Eye, Pencil, X, Flag } from 'lucide-react'
import { PDFDownloadButton } from './PDFDownloadButton'

export default function TestimonialTable({ testimonials, onStatusChange, onDelete, loading }) {
    const [selected, setSelected] = useState([])
    const [search, setSearch] = useState('')

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
                            <th>Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(t => (
                            <tr key={t.id} className={selected.includes(t.id) ? 'row-selected' : ''}>
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
                                <td className="col-date">{new Date(t.created_at).toLocaleDateString('en-ZA')}</td>
                                <td>{statusBadge(t.status)}</td>
                                <td>
                                    <div className="row-actions">
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
                        ))}
                    </tbody>
                </table>
            )}
            <p className="table-count">{filtered.length} testimonial{filtered.length !== 1 ? 's' : ''}</p>
        </div>
    )
}
