import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    Check, MinusCircle, Trash2, Flag, ExternalLink, Image as ImageIcon, File as FileIcon,
    Send, MessageCircle, Plus, Search, ChevronLeft, ChevronRight, X, FileText,
} from 'lucide-react'
import PDFPreviewDialog from './PDFPreviewDialog'
import { useCanPreviewPdf } from '../lib/useCanPreviewPdf'
import { PDFDownloadButton } from './PDFDownloadButton'
import { TableSkeleton } from './Skeleton'
import MoreMenu from './MoreMenu'

import { STATUS_MAP, importSource } from '../lib/status'
import { useConfirm } from '../lib/feedback'

export function StatusBadge({ status }) {
    const s = STATUS_MAP[status] || { label: status, cls: '' }
    return <span className={`status-badge ${s.cls}`}>{s.label}</span>
}

const SORTS = {
    newest: { label: 'Newest first', fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
    oldest: { label: 'Oldest first', fn: (a, b) => new Date(a.created_at) - new Date(b.created_at) },
    title:  { label: 'Title A to Z', fn: (a, b) => (a.title || '').localeCompare(b.title || '') },
    images: { label: 'Most images',  fn: (a, b) => (b.gallery_urls?.length || 0) - (a.gallery_urls?.length || 0) },
}
const MAX_CHIPS = 3

function formatDate(iso) {
    return iso ? new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
}

// Page numbers with gaps: 1 … 4 5 6 … 12
function pageList(page, total) {
    const set = new Set([1, total, page - 1, page, page + 1])
    const nums = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b)
    const out = []
    nums.forEach((n, i) => {
        if (i > 0 && n - nums[i - 1] > 1) out.push('gap-' + n)
        out.push(n)
    })
    return out
}

// Conditions (teal) then products (lime), capped at 3 chips plus a "+n" popover grouped by type.
function TagCell({ t }) {
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)
    const btnRef  = useRef(null)
    const conds = t.conditions || []
    const prods = t.products || []
    const all = [...conds.map(c => ['c', c]), ...prods.map(p => ['p', p])]
    const shown = all.slice(0, MAX_CHIPS)
    const extra = all.length - shown.length

    useEffect(() => {
        if (!open) return
        function onDown(e) { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
        function onKey(e) { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
    }, [open])

    if (!all.length) return <span className="tt-none">No tags</span>

    return (
        <div className="tt-chips" ref={wrapRef}>
            {shown.map(([k, v]) => (
                <span key={k + v} className={`tag tag-outline ${k === 'c' ? 'tag-condition' : 'tag-product'}`} title={v}>{v}</span>
            ))}
            {extra > 0 && (
                <>
                    <button
                        ref={btnRef}
                        type="button"
                        className="tt-more"
                        aria-expanded={open}
                        aria-label={`Show all ${all.length} tags`}
                        onClick={() => setOpen(v => !v)}
                    >+{extra}</button>
                    {open && (
                        <div className="tt-pop" role="dialog" aria-label="All tags">
                            {conds.length > 0 && <>
                                <div className="tt-pop-label">Conditions ({conds.length})</div>
                                <div className="tt-pop-list">{conds.map(c => <span key={c} className="tag tag-outline tag-condition">{c}</span>)}</div>
                            </>}
                            {prods.length > 0 && <>
                                <div className="tt-pop-label">Products ({prods.length})</div>
                                <div className="tt-pop-list">{prods.map(p => <span key={p} className="tag tag-outline tag-product">{p}</span>)}</div>
                            </>}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// All Testimonials table (ui-guide #tbl-testimonials). One card: status tabs,
// tools row, bulk bar, table (cards below 840px container width), footer.
export default function TestimonialTable({
    testimonials, onStatusChange, onDelete, loading,
    tabs = [], activeTab, onTabChange, extraTools = null,
}) {
    const [selected, setSelected] = useState([])
    const confirm = useConfirm()
    const [search, setSearch]     = useState('')
    const [sort, setSort]         = useState('newest')
    const [density, setDensity]   = useState('comfortable')
    const [page, setPage]         = useState(1)
    const [perPage, setPerPage]   = useState(50)
    const [pdfPreview, setPdfPreview] = useState(null)
    const canPreviewPdf = useCanPreviewPdf()
    const selAllRef = useRef(null)
    const selAllCardRef = useRef(null)

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        const rows = !q ? testimonials : testimonials.filter(t =>
            t.title?.toLowerCase().includes(q) ||
            t.person_name?.toLowerCase().includes(q) ||
            t.conditions?.some(c => c.toLowerCase().includes(q)) ||
            t.products?.some(p => p.toLowerCase().includes(q))
        )
        return [...rows].sort(SORTS[sort].fn)
    }, [testimonials, search, sort])

    const pages = Math.max(1, Math.ceil(filtered.length / perPage))
    const current = Math.min(page, pages)
    const start = (current - 1) * perPage
    const pageRows = filtered.slice(start, start + perPage)

    // Back to page 1 and clear the selection when the view changes (adjusted
    // while rendering, React's pattern for resetting state on a change).
    const viewKey = [activeTab, search, sort, perPage, testimonials.length].join('|')
    const [prevViewKey, setPrevViewKey] = useState(viewKey)
    if (prevViewKey !== viewKey) {
        setPrevViewKey(viewKey)
        setPage(1)
        setSelected([])
    }

    const pageIds = pageRows.map(t => t.id)
    const selectedOnPage = pageIds.filter(id => selected.includes(id)).length
    const allOnPage = pageIds.length > 0 && selectedOnPage === pageIds.length
    useEffect(() => {
        const ind = selectedOnPage > 0 && !allOnPage
        if (selAllRef.current) selAllRef.current.indeterminate = ind
        if (selAllCardRef.current) selAllCardRef.current.indeterminate = ind
    })

    function toggleSelect(id) {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
    function togglePage() {
        setSelected(prev => allOnPage ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])])
    }
    function bulk(status) {
        selected.forEach(id => onStatusChange(id, status))
        setSelected([])
    }
    async function bulkDelete() {
        const n = selected.length
        const ok = await confirm({
            title: `Delete ${n} testimonial${n !== 1 ? 's' : ''}?`,
            body: 'They are removed from the site and from admin. This cannot be undone.',
            confirmLabel: `Delete ${n}`,
            tone: 'danger',
        })
        if (!ok) return
        selected.forEach(id => onDelete(id))
        setSelected([])
    }
    async function deleteOne(t) {
        const ok = await confirm({
            title: 'Delete this testimonial?',
            body: `“${t.title}” is removed from the site and from admin. This cannot be undone.`,
            confirmLabel: 'Delete',
            tone: 'danger',
        })
        if (ok) onDelete(t.id)
    }
    function openPublic(t) {
        window.open(`/testimonial/${t.slug || t.id}`, '_blank', 'noopener,noreferrer')
    }

    const activeLabel = tabs.find(x => x.value === activeTab)

    return (
        <div className={`tt ${density === 'compact' ? 'is-compact' : ''}`}>
            {pdfPreview && <PDFPreviewDialog testimonial={pdfPreview} onClose={() => setPdfPreview(null)} />}
            {selected.length > 0 && (
                <div className="tt-bulk" role="region" aria-label="Bulk actions">
                    <span className="tt-bulk-n">{selected.length} selected</span>
                    <button type="button" className="btn-secondary" onClick={() => bulk('approved')}><Check size={16} aria-hidden="true" /> Publish</button>
                    <button type="button" className="btn-secondary" onClick={() => bulk('unpublished')}><MinusCircle size={16} aria-hidden="true" /> Unpublish</button>
                    <button type="button" className="btn-secondary" onClick={() => bulk('needs_editing')}><Flag size={16} aria-hidden="true" /> Flag</button>
                    <button type="button" className="btn-danger" onClick={bulkDelete}><Trash2 size={16} aria-hidden="true" /> Delete</button>
                    <button type="button" className="btn-ghost tt-bulk-clear" onClick={() => setSelected([])}><X size={16} aria-hidden="true" /> Clear</button>
                </div>
            )}

            {tabs.length > 0 && (
                <div className="tt-tabsrow">
                    <div className="tabs" role="tablist" aria-label="Status filter">
                        {tabs.map(f => (
                            <button
                                key={f.value}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === f.value}
                                className={`tab ${activeTab === f.value ? 'active' : ''}`}
                                onClick={() => onTabChange(f.value)}
                            >
                                {f.label} <span className="count">{f.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="tt-tools">
                {tabs.length > 0 && (
                    <select
                        className="tt-select tt-statusselect"
                        aria-label="Status filter"
                        value={activeTab}
                        onChange={e => onTabChange(e.target.value)}
                    >
                        {tabs.map(f => <option key={f.value} value={f.value}>{f.label} ({f.count})</option>)}
                    </select>
                )}
                <label className="tt-selall">
                    <input ref={selAllCardRef} type="checkbox" checked={allOnPage} onChange={togglePage} /> Select all
                </label>
                <div className="tt-search">
                    <label className="sr-only" htmlFor="tt-search">Search testimonials</label>
                    <Search size={16} className="tt-search-ic" aria-hidden="true" />
                    <input
                        id="tt-search"
                        type="search"
                        placeholder="Search by title, name, condition or product"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                {extraTools}
                <select className="tt-select" aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}>
                    {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
                <div className="segmented tt-density" role="group" aria-label="Row density">
                    <button type="button" aria-pressed={density === 'comfortable'} onClick={() => setDensity('comfortable')}>Comfortable</button>
                    <button type="button" aria-pressed={density === 'compact'} onClick={() => setDensity('compact')}>Compact</button>
                </div>
            </div>

            {loading ? <TableSkeleton /> : filtered.length === 0 ? (
                <div className="tt-empty">
                    <p><strong>No testimonials found.</strong></p>
                    <p>{search ? 'Try a different search, or clear it.' : `Nothing in ${activeLabel ? `"${activeLabel.label}"` : 'this view'} yet.`}</p>
                    {search && <button type="button" className="btn-secondary" onClick={() => setSearch('')}>Clear search</button>}
                </div>
            ) : (
                <table role="table" aria-label="Testimonials">
                    <thead>
                        <tr role="row">
                            <th role="columnheader" className="c-sel">
                                <input ref={selAllRef} type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" />
                            </th>
                            <th role="columnheader" className="c-main">Testimonial</th>
                            <th role="columnheader" className="c-tags">Conditions &amp; products</th>
                            <th role="columnheader" className="c-status">Status</th>
                            <th role="columnheader" className="c-acts"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map(t => {
                            const src = t.is_imported ? importSource(t.imported_from) : null
                            const imgs = t.gallery_urls?.length || 0
                            const isSel = selected.includes(t.id)
                            return (
                                <tr role="row" key={t.id} className={isSel ? 'is-selected' : ''}>
                                    <td role="cell" className="c-sel">
                                        <input type="checkbox" checked={isSel} onChange={() => toggleSelect(t.id)} aria-label={`Select ${t.title}`} />
                                    </td>
                                    <td role="cell" className="c-main">
                                        <Link to={`/admin/edit/${t.id}`} className="tt-title">{t.title || 'Untitled'}</Link>
                                        <div className="tt-meta">
                                            <span>{t.anonymous ? <em>Anonymous</em> : (t.person_name || <em>Unnamed</em>)}</span>
                                            <span>{formatDate(t.created_at)}</span>
                                            {imgs > 0 && <span><ImageIcon size={14} aria-hidden="true" /> {imgs} image{imgs !== 1 ? 's' : ''}</span>}
                                            {src && (
                                                <span className={`badge-source badge-source--${src.cls}`} title={`Imported from: ${t.imported_from}`}>
                                                    <src.Icon size={12} aria-hidden="true" /> {src.label}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td role="cell" className="c-tags"><TagCell t={t} /></td>
                                    <td role="cell" className="c-status"><StatusBadge status={t.status} /></td>
                                    <td role="cell" className="c-acts">
                                        <div className="tt-acts">
                                            <Link to={`/admin/edit/${t.id}`} className="btn-secondary">Edit</Link>
                                            {t.status === 'approved'
                                                ? <button type="button" className="btn-secondary" onClick={() => onStatusChange(t.id, 'unpublished')}>Unpublish</button>
                                                : <button type="button" className="btn-secondary" onClick={() => onStatusChange(t.id, 'approved')}>Publish</button>}
                                            <MoreMenu label={`More actions for ${t.title}`}>
                                                <button type="button" role="menuitem" onClick={() => openPublic(t)}>
                                                    <ExternalLink size={16} aria-hidden="true" /> View public page
                                                </button>
                                                <button type="button" role="menuitem" onClick={() => onStatusChange(t.id, t.status === 'needs_editing' ? 'pending' : 'needs_editing')}>
                                                    <Flag size={16} aria-hidden="true" /> {t.status === 'needs_editing' ? 'Remove needs editing flag' : 'Flag as needs editing'}
                                                </button>
                                                {canPreviewPdf && (
                                                    <button type="button" role="menuitem" onClick={() => setPdfPreview(t)}>
                                                        <FileText size={16} aria-hidden="true" /> Preview PDF
                                                    </button>
                                                )}
                                                <PDFDownloadButton testimonial={t} variant="menuitem" />
                                                <hr />
                                                <button type="button" role="menuitem" className="danger" onClick={() => deleteOne(t)}>
                                                    <Trash2 size={16} aria-hidden="true" /> Delete
                                                </button>
                                            </MoreMenu>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}

            {!loading && filtered.length > 0 && (
                <div className="tt-foot">
                    <span>Showing {start + 1} to {Math.min(start + perPage, filtered.length)} of {filtered.length}</span>
                    <div className="tt-footr">
                        <label className="tt-ps">
                            Rows per page
                            <select className="tt-select" value={perPage} onChange={e => setPerPage(Number(e.target.value))}>
                                {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                        {pages > 1 && (
                            <nav className="pager" aria-label="Pages">
                                <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft size={16} aria-hidden="true" /></button>
                                {pageList(current, pages).map(n => typeof n === 'string'
                                    ? <span key={n} className="pager-gap" aria-hidden="true">…</span>
                                    : <button key={n} type="button" className={`pn ${n === current ? 'current' : ''}`} aria-current={n === current ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>
                                )}
                                <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight size={16} aria-hidden="true" /></button>
                            </nav>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
