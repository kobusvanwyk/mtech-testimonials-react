import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Pencil, Trash2, Check, GitMerge, AlertTriangle, Search, X, ChevronRight } from 'lucide-react'
import { ListPageSkeleton } from '../../components/Skeleton'
import { useDialog } from '../../lib/useDialog'
import { useConfirm, useToast } from '../../lib/feedback'
import { cleanConditionName } from '../../lib/syncConditions'

// Categories (ui-guide #p-manage, #p-merge, DESIGN.md "Toolbar card" rule):
// one card with Conditions / Products tabs, a tools row (search, sort, unused
// filter, Add, Bulk add), compact management rows, and a sticky bar while rows
// are selected. Possible duplicates sit behind one amber bar that opens a
// review dialog, one group at a time.

// ── Fuzzy similarity (Levenshtein) ────────────────────────────────────────────
function similarity(a, b) {
    a = a.toLowerCase().trim()
    b = b.toLowerCase().trim()
    if (a === b) return 1
    if (!a.length || !b.length) return 0
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
        Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    )
    for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1]
                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return 1 - dp[a.length][b.length] / Math.max(a.length, b.length)
}
const SIMILARITY_THRESHOLD = 0.62

// Same name once notes in brackets are dropped: "Cancer (implied by ...)" and "Cancer"
const bare = name => cleanConditionName(name).toLowerCase()

// "ADHD" and "Attention Deficit Hyperactivity Disorder": a short all-capitals
// name that matches the other name's initials (small words ignored)
const SMALL_WORDS = new Set(['and', 'of', 'the', 'in', 'to', 'a'])
function isAcronymOf(short, long) {
    if (!/^[A-Z0-9]{2,6}$/.test(short.trim())) return false
    const initials = long.split(/[\s-]+/).filter(w => w && !SMALL_WORDS.has(w.toLowerCase())).map(w => w[0]).join('').toUpperCase()
    return initials.length > 1 && initials === short.trim()
}
function relatedNames(a, b) {
    return bare(a) === bare(b) || isAcronymOf(a, b) || isAcronymOf(b, a)
}

// ── Duplicate review (dismissals are remembered in this browser) ────────────
function getDismissedKey(group) {
    return 'dismissed_merge_' + [...group].map(i => i.name).sort().join('|')
}

function readDismissed() {
    try { return JSON.parse(localStorage.getItem('dismissed_merges') || '[]') } catch { return [] }
}

function MergeReview({ groups, noun, chip, onMerge, onDismiss, onClose }) {
    const [index, setIndex] = useState(0)
    const ref = useDialog(true, onClose)
    const i = Math.min(index, groups.length - 1)
    const group = groups[i]

    const sorted = useMemo(
        () => (group ? [...group].sort((a, b) => (b._count - a._count) || a.name.localeCompare(b.name)) : []),
        [group]
    )
    const [winner, setWinner] = useState(sorted[0]?.name)
    const [forGroup, setForGroup] = useState(group)
    if (forGroup !== group) {
        setForGroup(group)
        setWinner(sorted[0]?.name)
    }

    if (!group) return null

    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal merge-dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby="merge-dialog-title">
                <div className="merge-dialog-hd">
                    <div>
                        <h3 id="merge-dialog-title">Possible duplicate</h3>
                        <p className="merge-dialog-n">{i + 1} of {groups.length}</p>
                    </div>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Close review">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
                <p>These {noun} look similar. Choose the name to keep: testimonials using the others move to it.</p>
                <fieldset className="merge-group">
                    <legend className="sr-only">Which name should stay?</legend>
                    <div className="pair">
                        {group.map(item => (
                            <label key={item.name} className={`pick ${winner === item.name ? 'on' : ''}`}>
                                <input
                                    type="radio"
                                    name="merge-winner"
                                    value={item.name}
                                    checked={winner === item.name}
                                    onChange={() => setWinner(item.name)}
                                    data-autofocus={winner === item.name ? true : undefined}
                                />
                                <span className={`tag tag-outline tag-${chip}`}>{item.name}</span>
                                <span className="cnt">{item._count} testimonial{item._count !== 1 ? 's' : ''}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className="merge-dialog-ft">
                    <button type="button" className="btn-ghost" onClick={() => setIndex((i + 1) % groups.length)} disabled={groups.length < 2}>
                        Skip <ChevronRight size={16} aria-hidden="true" />
                    </button>
                    <span className="merge-dialog-sp" />
                    <button type="button" className="btn-secondary" onClick={() => onDismiss(group)}>Not a duplicate</button>
                    <button type="button" className="btn-primary" onClick={() => onMerge(group, winner)}>
                        <GitMerge size={16} aria-hidden="true" /> Keep &ldquo;{winner}&rdquo;
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── One list (conditions or products) ───────────────────────────────────────
const SORTS = {
    az:     { label: 'A to Z',            fn: (a, b) => a.name.localeCompare(b.name) },
    most:   { label: 'Most used',         fn: (a, b) => (b._count - a._count) || a.name.localeCompare(b.name) },
    least:  { label: 'Least used',        fn: (a, b) => (a._count - b._count) || a.name.localeCompare(b.name) },
}

function CategorySection({ title, table, color, fuzzy = true, onDataChange, hidden }) {
    const noun = table === 'products' ? 'product' : 'condition'
    const [items, setItems]         = useState([])
    const [loading, setLoading]     = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [addValue, setAddValue]   = useState('')
    const [adding, setAdding]       = useState(false)
    const [bulkAdding, setBulkAdding] = useState(false)
    const [bulkValue, setBulkValue]   = useState('')
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [saving, setSaving]       = useState(false)
    const [query, setQuery]         = useState('')
    const [sort, setSort]           = useState('az')
    const [unusedOnly, setUnusedOnly] = useState(false)
    const [reviewing, setReviewing] = useState(false)
    const [dismissed, setDismissed] = useState(readDismissed)
    const addInputRef = useRef()
    const confirm = useConfirm()
    const toast = useToast()
    const bulkDialogRef = useDialog(bulkAdding, () => { setBulkAdding(false); setBulkValue('') })

    useEffect(() => { fetchItems() }, [])

    async function fetchItems() {
        const { data: tableData } = await supabase
            .from(table)
            .select('id, name, active, sort_order')
            .order('sort_order')
            .order('name')

        const { data: testimonials } = await supabase
            .from('testimonials')
            .select(table === 'products' ? 'products' : 'conditions')

        const countMap = {}
        ;(testimonials || []).forEach(t => {
            const field = table === 'products' ? t.products : t.conditions
            // Ignore capitalisation: "Digestive issues" on the list is in use when a
            // testimonial says "Digestive Issues", so it must not count as unused
            ;(field || []).forEach(v => { const k = v.toLowerCase(); countMap[k] = (countMap[k] || 0) + 1 })
        })

        const result = (tableData || []).map(item => ({ ...item, _count: countMap[item.name.toLowerCase()] || 0 }))
        setItems(result)
        setLoading(false)
        if (onDataChange) onDataChange(result)
    }

    function flash(text, type = 'success') {
        if (type === 'error') toast.error(text)
        else toast.success(text)
    }

    async function handleAdd() {
        const name = addValue.trim()
        if (!name) return

        // Case-insensitive duplicate check
        const duplicate = items.find(i => i.name.toLowerCase() === name.toLowerCase())
        if (duplicate) {
            flash(`"${duplicate.name}" already exists.`, 'error')
            return
        }

        setSaving(true)
        const { error } = await supabase.from(table).insert({ name, active: true, sort_order: 0 })
        if (error) {
            flash(error.message, 'error')
        } else {
            flash(`Added "${name}"`)
            setAddValue('')
            setAdding(false)
            await fetchItems()
        }
        setSaving(false)
    }

    async function handleBulkAdd() {
        const names = bulkValue
            .split('\n')
            .map(n => n.trim())
            .filter(Boolean)
        if (!names.length) return

        setSaving(true)
        let added = 0, skipped = 0
        for (const name of names) {
            const duplicate = items.find(i => i.name.toLowerCase() === name.toLowerCase())
            if (duplicate) { skipped++; continue }
            const { error } = await supabase.from(table).insert({ name, active: true, sort_order: 0 })
            if (!error) added++
        }
        flash(`Added ${added} item${added !== 1 ? 's' : ''}${skipped ? `, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}` : ''}`)
        setBulkValue('')
        setBulkAdding(false)
        fetchItems()
        setSaving(false)
    }

    async function handleBulkDelete() {
        return deleteItems(items.filter(i => selectedIds.has(i.id)))
    }

    // Unused ones are on no testimonial, so nothing else changes
    async function handleDeleteUnused() {
        return deleteItems(items.filter(i => i._count === 0), { listNames: true })
    }

    async function deleteItems(toDelete, { listNames = false } = {}) {
        if (!toDelete.length) return
        const withTestimonials = toDelete.filter(i => i._count > 0)
        const n = toDelete.length
        const names = toDelete.map(i => i.name).sort((a, b) => a.localeCompare(b))
        const ok = await confirm({
            title: `Delete ${n} ${n !== 1 ? table : noun}?`,
            body: <>
                {withTestimonials.length
                    ? `${withTestimonials.length} of them ${withTestimonials.length !== 1 ? 'are' : 'is'} used in testimonials and will be removed from those too. This cannot be undone.`
                    : 'None of them is on a testimonial. This cannot be undone.'}
                {listNames && <span className="cat-delete-list">{names.join(', ')}</span>}
            </>,
            confirmLabel: `Delete ${n}`,
            tone: 'danger',
        })
        if (!ok) return

        setSaving(true)
        const field = table === 'products' ? 'products' : 'conditions'
        for (const item of toDelete) {
            if (item._count > 0) {
                const { data: affected } = await supabase
                    .from('testimonials')
                    .select('id, ' + field)
                    .contains(field, [item.name])
                for (const t of (affected || [])) {
                    const updated = t[field].filter(x => x !== item.name)
                    await supabase.from('testimonials').update({ [field]: updated }).eq('id', t.id)
                }
            }
            await supabase.from(table).delete().eq('id', item.id)
        }
        flash(`Deleted ${toDelete.length} item${toDelete.length !== 1 ? 's' : ''}`)
        setSelectedIds(new Set())
        await fetchItems()
        setSaving(false)
    }

    function toggleSelect(id) {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }


    async function handleRename(item) {
        const name = editValue.trim()
        if (!name || name === item.name) { setEditingId(null); return }

        // Case-insensitive duplicate check (exclude self)
        const duplicate = items.find(i => i.id !== item.id && i.name.toLowerCase() === name.toLowerCase())
        if (duplicate) {
            flash(`"${duplicate.name}" already exists. Use Merge instead.`, 'error')
            return
        }

        setSaving(true)
        const { error } = await supabase.from(table).update({ name }).eq('id', item.id)
        if (error) { flash(error.message, 'error'); setSaving(false); return }

        const field = table === 'products' ? 'products' : 'conditions'
        const { data: affected } = await supabase
            .from('testimonials')
            .select('id, ' + field)
            .contains(field, [item.name])

        for (const t of (affected || [])) {
            const updated = t[field].map(x => x === item.name ? name : x)
            await supabase.from('testimonials').update({ [field]: updated }).eq('id', t.id)
        }

        flash(`Renamed "${item.name}" → "${name}" on ${(affected || []).length} testimonial(s)`)
        setEditingId(null)
        fetchItems()
        setSaving(false)
    }

    async function handleDelete(item) {
        const ok = await confirm({
            title: `Delete “${item.name}”?`,
            body: item._count > 0
                ? `It is removed from ${item._count} testimonial${item._count !== 1 ? 's' : ''} as well. This cannot be undone.`
                : 'This cannot be undone.',
            confirmLabel: 'Delete',
            tone: 'danger',
        })
        if (!ok) return

        setSaving(true)
        if (item._count > 0) {
            const field = table === 'products' ? 'products' : 'conditions'
            const { data: affected } = await supabase
                .from('testimonials')
                .select('id, ' + field)
                .contains(field, [item.name])
            for (const t of (affected || [])) {
                const updated = t[field].filter(x => x !== item.name)
                await supabase.from('testimonials').update({ [field]: updated }).eq('id', t.id)
            }
        }

        await supabase.from(table).delete().eq('id', item.id)
        flash(`Deleted "${item.name}"`)
        fetchItems()
        setSaving(false)
    }

    // Merge: update all testimonials using any losing name → winner, then delete losers
    async function handleMerge(group, winnerName) {
        // The review dialog's "Keep" button is the confirmation.
        setSaving(true)

        const field = table === 'products' ? 'products' : 'conditions'
        const losers = group.filter(item => item.name !== winnerName)

        for (const loser of losers) {
            // Update testimonials
            const { data: affected } = await supabase
                .from('testimonials')
                .select('id, ' + field)
                .contains(field, [loser.name])
            for (const t of (affected || [])) {
                const updated = t[field].map(x => x === loser.name ? winnerName : x)
                await supabase.from('testimonials').update({ [field]: updated }).eq('id', t.id)
            }
            // Delete the loser from master table
            await supabase.from(table).delete().eq('id', loser.id)
        }

        flash(`Merged ${losers.length} variant(s) into "${winnerName}"`)
        fetchItems()
        setSaving(false)
    }

    // Detect duplicates: exact case-insensitive matches + fuzzy similar names (conditions only)
    const duplicateGroups = (() => {
        const visited = new Set()
        const groups = []

        for (let i = 0; i < items.length; i++) {
            if (visited.has(items[i].id)) continue
            const group = [items[i]]

            for (let j = i + 1; j < items.length; j++) {
                if (visited.has(items[j].id)) continue
                const sim = similarity(items[i].name, items[j].name)
                if (fuzzy ? (sim >= SIMILARITY_THRESHOLD || relatedNames(items[i].name, items[j].name)) : sim === 1) {
                    group.push(items[j])
                    visited.add(items[j].id)
                }
            }

            if (group.length > 1) {
                visited.add(items[i].id)
                groups.push(group)
            }
        }
        return groups
    })()

    function startEdit(item) {
        setEditingId(item.id)
        setEditValue(item.name)
        setAdding(false)
    }

    function startAdd() {
        setAdding(true)
        setEditingId(null)
        setAddValue('')
        setTimeout(() => addInputRef.current?.focus(), 50)
    }

    function dismissGroup(group) {
        const next = [...dismissed, getDismissedKey(group)]
        setDismissed(next)
        try { localStorage.setItem('dismissed_merges', JSON.stringify(next)) } catch { /* private mode */ }
    }

    const reviewGroups = duplicateGroups.filter(g => !dismissed.includes(getDismissedKey(g)))
    const unusedCount = items.filter(i => i._count === 0).length

    const q = query.trim().toLowerCase()
    const shown = items
        .filter(i => (!q || i.name.toLowerCase().includes(q)) && (!unusedOnly || i._count === 0))
        .sort(SORTS[sort].fn)
    const allShownSelected = shown.length > 0 && shown.every(i => selectedIds.has(i.id))

    function toggleSelectShown() {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (allShownSelected) shown.forEach(i => next.delete(i.id))
            else shown.forEach(i => next.add(i.id))
            return next
        })
    }

    if (hidden) return null
    if (loading) return <div className="cat-loading"><ListPageSkeleton rows={8} /></div>

    return (
        <div className="cat-panel" role="tabpanel" id={`cat-panel-${table}`} aria-labelledby={`cat-tab-${table}`}>
            {/* Possible duplicates: one quiet bar, reviewed in a dialog */}
            {reviewGroups.length > 0 && (
                <div className="cat-dupbar">
                    <AlertTriangle size={16} aria-hidden="true" />
                    <span><strong>{reviewGroups.length} possible duplicate{reviewGroups.length !== 1 ? 's' : ''}</strong> found by similar names</span>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setReviewing(true)}>Review</button>
                </div>
            )}

            {/* Tools row: controls sit with the list they control */}
            <div className="tt-tools cat-tools">
                <input
                    type="checkbox"
                    className="cat-select-all"
                    checked={allShownSelected}
                    onChange={toggleSelectShown}
                    aria-label={`Select all ${shown.length} ${title.toLowerCase()} shown`}
                />
                <div className="tt-search">
                    <label className="sr-only" htmlFor={`cat-search-${table}`}>Search {title.toLowerCase()}</label>
                    <Search size={16} className="tt-search-ic" aria-hidden="true" />
                    <input
                        id={`cat-search-${table}`}
                        type="search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={`Search ${items.length} ${title.toLowerCase()}`}
                        autoComplete="off"
                    />
                </div>
                <select className="tt-select" aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}>
                    {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button
                    type="button"
                    className={`cat-filter ${unusedOnly ? 'on' : ''}`}
                    aria-pressed={unusedOnly}
                    onClick={() => setUnusedOnly(v => !v)}
                >
                    Unused <span className="count">{unusedCount}</span>
                </button>
                {unusedOnly && unusedCount > 0 && (
                    <button type="button" className="btn-danger btn-sm" onClick={handleDeleteUnused} disabled={saving}>
                        <Trash2 size={14} aria-hidden="true" /> Delete all {unusedCount} unused
                    </button>
                )}
                <span className="cat-tools-sp" />
                <button type="button" className="btn-secondary" onClick={() => { setBulkAdding(true); setAdding(false) }}>
                    Bulk add
                </button>
                <button type="button" className="btn-primary" onClick={startAdd}>
                    <Plus size={16} aria-hidden="true" /> Add {noun}
                </button>
            </div>

            {selectedIds.size > 0 && (
                <div className="tt-bulk cat-bulk" role="region" aria-label="Bulk actions">
                    <span className="tt-bulk-n">{selectedIds.size} selected</span>
                    <button type="button" className="btn-danger" onClick={handleBulkDelete} disabled={saving}>
                        <Trash2 size={16} aria-hidden="true" /> Delete {selectedIds.size}
                    </button>
                    <button type="button" className="btn-ghost tt-bulk-clear" onClick={() => setSelectedIds(new Set())}>
                        <X size={16} aria-hidden="true" /> Clear
                    </button>
                </div>
            )}

            <ul className="cat-list" aria-label={title}>
                {adding && (
                    <li className="manage-row adding">
                        <input
                            ref={addInputRef}
                            className="category-rename-input"
                            aria-label={`New ${noun} name`}
                            value={addValue}
                            placeholder={`New ${noun} name`}
                            onChange={e => setAddValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleAdd()
                                if (e.key === 'Escape') setAdding(false)
                            }}
                        />
                        <div className="end">
                            <button type="button" className="btn-primary btn-sm" onClick={handleAdd} disabled={saving || !addValue.trim()}>
                                <Check size={16} aria-hidden="true" /> Add
                            </button>
                            <button type="button" className="btn-ghost btn-sm" onClick={() => setAdding(false)}>
                                Cancel
                            </button>
                        </div>
                    </li>
                )}

                {shown.map(item => (
                    <li key={item.id} className={`manage-row ${selectedIds.has(item.id) ? 'selected' : ''}`}>
                        <input
                            type="checkbox"
                            className="cat-row-checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            aria-label={`Select ${item.name}`}
                        />
                        {editingId === item.id ? (
                            <input
                                className="category-rename-input"
                                aria-label={`Rename ${item.name}`}
                                placeholder={item.name}
                                value={editValue}
                                autoFocus
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleRename(item)
                                    if (e.key === 'Escape') setEditingId(null)
                                }}
                            />
                        ) : (
                            <span className={`tag tag-outline tag-${color}`} title={item.name}>{item.name}</span>
                        )}

                        {editingId !== item.id && (
                            <span className="cnt">
                                {item._count > 0
                                    ? `${item._count} testimonial${item._count !== 1 ? 's' : ''}`
                                    : <em className="cat-unused">Unused</em>
                                }
                            </span>
                        )}

                        <div className="end">
                            {editingId === item.id ? (
                                <>
                                    <button type="button" className="btn-primary btn-sm" onClick={() => handleRename(item)} disabled={saving}>
                                        <Check size={16} aria-hidden="true" /> Save
                                    </button>
                                    <button type="button" className="btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button type="button" className="btn-ghost btn-sm" onClick={() => startEdit(item)} aria-label={`Rename ${item.name}`}>
                                        <Pencil size={16} aria-hidden="true" /> <span className="cat-act-txt">Rename</span>
                                    </button>
                                    <button type="button" className="btn-ghost btn-sm btn-ghost--danger" onClick={() => handleDelete(item)} aria-label={`Delete ${item.name}`}>
                                        <Trash2 size={16} aria-hidden="true" /> <span className="cat-act-txt">Delete</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {items.length === 0 && !adding && (
                <p className="cat-empty">No {table} yet. Use &ldquo;Add {noun}&rdquo; to create the first one.</p>
            )}
            {items.length > 0 && shown.length === 0 && (
                <p className="cat-empty">
                    No {table} match{q ? <> &ldquo;{query.trim()}&rdquo;</> : ''}{unusedOnly ? ' among unused ones' : ''}.
                </p>
            )}
            <p className="cat-foot" aria-live="polite">{shown.length} shown · {items.length} in total</p>

            {/* Bulk add dialog */}
            {bulkAdding && (
                <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && (setBulkAdding(false), setBulkValue(''))}>
                    <div className="modal" ref={bulkDialogRef} role="dialog" aria-modal="true" aria-labelledby={`bulk-title-${table}`}>
                        <h3 id={`bulk-title-${table}`}>Bulk add {table}</h3>
                        <label className="bulk-add-label" htmlFor={`bulk-${table}`}>One {noun} per line. Names that already exist are skipped.</label>
                        <textarea
                            id={`bulk-${table}`}
                            className="bulk-add-textarea"
                            value={bulkValue}
                            onChange={e => setBulkValue(e.target.value)}
                            placeholder={table === 'products' ? 'e.g.\nAmbrotose Complex\nPLUS\nCatalyst' : 'e.g.\nDiabetes\nHigh Blood Pressure\nArthritis'}
                            rows={8}
                            data-autofocus
                        />
                        <div className="modal-ft">
                            <button type="button" className="btn-secondary" onClick={() => { setBulkAdding(false); setBulkValue('') }}>Cancel</button>
                            <button type="button" className="btn-primary" onClick={handleBulkAdd} disabled={saving || !bulkValue.trim()}>
                                <Check size={16} aria-hidden="true" /> Add all
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {reviewing && reviewGroups.length > 0 && (
                <MergeReview
                    groups={reviewGroups}
                    noun={table}
                    chip={color}
                    onMerge={handleMerge}
                    onDismiss={dismissGroup}
                    onClose={() => setReviewing(false)}
                />
            )}
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
    { table: 'conditions', title: 'Health Conditions', label: 'Conditions', color: 'condition', fuzzy: true },
    { table: 'products',   title: 'Products',          label: 'Products',   color: 'product',   fuzzy: false },
]

export default function Categories() {
    const [tab, setTab] = useState('conditions')
    const [counts, setCounts] = useState({})

    function onTabKey(e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
        e.preventDefault()
        const next = TABS[(TABS.findIndex(t => t.table === tab) + 1) % TABS.length].table
        setTab(next)
        document.getElementById(`cat-tab-${next}`)?.focus()
    }

    return (
        <div className="admin-page-content">
            <h1>Categories</h1>
            <p className="page-sub">
                Health conditions and products used across testimonials, the submission form and the
                public menus. Renames and merges update every testimonial that uses them.
            </p>

            <div className="tt cat-card">
                <div className="tt-tabsrow">
                    <div className="tabs" role="tablist" aria-label="Category type" onKeyDown={onTabKey}>
                        {TABS.map(t => (
                            <button
                                key={t.table}
                                id={`cat-tab-${t.table}`}
                                type="button"
                                role="tab"
                                aria-selected={tab === t.table}
                                aria-controls={`cat-panel-${t.table}`}
                                tabIndex={tab === t.table ? 0 : -1}
                                className={`tab ${tab === t.table ? 'active' : ''}`}
                                onClick={() => setTab(t.table)}
                            >
                                {t.label} {counts[t.table] != null && <span className="count">{counts[t.table]}</span>}
                            </button>
                        ))}
                    </div>
                </div>
                {TABS.map(t => (
                    <CategorySection
                        key={t.table}
                        title={t.title}
                        table={t.table}
                        color={t.color}
                        fuzzy={t.fuzzy}
                        hidden={tab !== t.table}
                        onDataChange={rows => setCounts(c => ({ ...c, [t.table]: rows.length }))}
                    />
                ))}
            </div>
        </div>
    )
}
