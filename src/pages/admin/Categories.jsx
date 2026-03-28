import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Tag, Plus, Pencil, Trash2, Check, X, GitMerge } from 'lucide-react'

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

// ── Merge warning banner ──────────────────────────────────────────────────────
function getDismissedKey(group) {
    return 'dismissed_merge_' + [...group].map(i => i.name).sort().join('|')
}

function MergeWarning({ duplicateGroups, onMerge }) {
    const [dismissed, setDismissed] = useState(() => {
        try { return JSON.parse(localStorage.getItem('dismissed_merges') || '[]') } catch { return [] }
    })

    function dismiss(group) {
        const key = getDismissedKey(group)
        const next = [...dismissed, key]
        setDismissed(next)
        localStorage.setItem('dismissed_merges', JSON.stringify(next))
    }

    const visible = duplicateGroups.filter(g => !dismissed.includes(getDismissedKey(g)))
    if (!visible.length) return null

    return (
        <div className="merge-warning">
            <strong>⚠ Possible duplicates detected</strong>
            <p>The following conditions look similar and may be the same (different capitalisation or typos). Use Merge to combine them, or Dismiss if they are intentionally different.</p>
            {visible.map(group => (
                <MergeGroup key={group[0].name} group={group} onMerge={onMerge} onDismiss={() => dismiss(group)} />
            ))}
        </div>
    )
}

function MergeGroup({ group, onMerge, onDismiss }) {
    // Default winner = whichever has the most testimonials; tie = first alphabetically
    const sorted = [...group].sort((a, b) => (b._count - a._count) || a.name.localeCompare(b.name))
    const [winner, setWinner] = useState(sorted[0].name)

    return (
        <div className="merge-group">
            <div className="merge-variants">
                {group.map(item => (
                    <label key={item.name} className={`merge-option ${winner === item.name ? 'selected' : ''}`}>
                        <input
                            type="radio"
                            name={`merge-${group[0].name}`}
                            value={item.name}
                            checked={winner === item.name}
                            onChange={() => setWinner(item.name)}
                        />
                        <span className="tag tag-condition">{item.name}</span>
                        <span className="merge-count">{item._count} testimonial{item._count !== 1 ? 's' : ''}</span>
                    </label>
                ))}
            </div>
            <div className="merge-group-actions">
                <button className="merge-btn" onClick={() => onMerge(group, winner)}>
                    <GitMerge size={13} /> Keep "{winner}"
                </button>
                <button className="merge-dismiss-btn" onClick={onDismiss}>
                    Not a duplicate
                </button>
            </div>
        </div>
    )
}

// ── Reusable section ──────────────────────────────────────────────────────────
function CategorySection({ title, table, color, fuzzy = true, onDataChange }) {
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
    const [message, setMessage]     = useState(null)
    const addInputRef = useRef()

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
            ;(field || []).forEach(v => { countMap[v] = (countMap[v] || 0) + 1 })
        })

        const result = (tableData || []).map(item => ({ ...item, _count: countMap[item.name] || 0 }))
        setItems(result)
        setLoading(false)
        if (onDataChange) onDataChange(result)
    }

    function flash(text, type = 'success') {
        setMessage({ text, type })
        setTimeout(() => setMessage(null), 5000)
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
        const toDelete = items.filter(i => selectedIds.has(i.id))
        const withTestimonials = toDelete.filter(i => i._count > 0)
        const msg = withTestimonials.length
            ? `Delete ${toDelete.length} item${toDelete.length !== 1 ? 's' : ''}? ${withTestimonials.length} of them are used in testimonials and will be removed from those too. This cannot be undone.`
            : `Delete ${toDelete.length} item${toDelete.length !== 1 ? 's' : ''}? This cannot be undone.`
        if (!window.confirm(msg)) return

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

    function toggleSelectAll() {
        setSelectedIds(prev =>
            prev.size === items.length ? new Set() : new Set(items.map(i => i.id))
        )
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
        if (!window.confirm(
            item._count > 0
                ? `Remove "${item.name}" from ${item._count} testimonial(s) and delete it? This cannot be undone.`
                : `Delete "${item.name}"? This cannot be undone.`
        )) return

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
        if (!window.confirm(`Merge all variants into "${winnerName}"? This will update all affected testimonials.`)) return
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
                if (fuzzy ? sim >= SIMILARITY_THRESHOLD : sim === 1) {
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

    if (loading) return <div className="loading">Loading…</div>

    return (
        <div className="edit-section">
            <div className="cat-section-header">
                <input
                    type="checkbox"
                    className="cat-select-all"
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={toggleSelectAll}
                    title="Select all"
                />
                <h3 className="cat-section-title">
                    {title} <span className="cat-total">({items.length})</span>
                </h3>
                {selectedIds.size > 0 && (
                    <button className="cat-add-btn delete-selected" onClick={handleBulkDelete} disabled={saving}>
                        <Trash2 size={14} /> Delete {selectedIds.size}
                    </button>
                )}
                <button className="cat-add-btn" onClick={startAdd}>
                    <Plus size={14} /> Add
                </button>
                <button className="cat-add-btn bulk" onClick={() => { setBulkAdding(v => !v); setAdding(false) }}>
                    <Plus size={14} /> Bulk Add
                </button>
            </div>

            {/* Merge warnings */}
            <MergeWarning duplicateGroups={duplicateGroups} onMerge={handleMerge} />

            {/* Bulk add */}
            {bulkAdding && (
                <div className="bulk-add-box">
                    <p className="bulk-add-label">One {table === 'products' ? 'product' : 'condition'} per line:</p>
                    <textarea
                        className="bulk-add-textarea"
                        value={bulkValue}
                        onChange={e => setBulkValue(e.target.value)}
                        placeholder={`e.g.\nDiabetes\nHigh Blood Pressure\nArthritis`}
                        rows={6}
                        autoFocus
                    />
                    <div className="bulk-add-actions">
                        <button className="cat-btn save" onClick={handleBulkAdd} disabled={saving || !bulkValue.trim()}>
                            <Check size={13} /> Add All
                        </button>
                        <button className="cat-btn cancel" onClick={() => { setBulkAdding(false); setBulkValue('') }}>
                            <X size={13} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {message && (
                <div className={`cat-message ${message.type}`}>{message.text}</div>
            )}

            {/* Add new row */}
            {adding && (
                <div className="category-row adding">
                    <input
                        ref={addInputRef}
                        className="category-rename-input"
                        value={addValue}
                        placeholder={`New ${table === 'products' ? 'product' : 'condition'} name…`}
                        onChange={e => setAddValue(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleAdd()
                            if (e.key === 'Escape') setAdding(false)
                        }}
                    />
                    <div className="category-actions">
                        <button className="cat-btn save" onClick={handleAdd} disabled={saving || !addValue.trim()}>
                            <Check size={13} /> Add
                        </button>
                        <button className="cat-btn cancel" onClick={() => setAdding(false)}>
                            <X size={13} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {items.length === 0 && !adding && (
                <p className="table-empty">No {table} yet. Add one above.</p>
            )}

            {items.map(item => (
                <div key={item.id} className={`category-row ${selectedIds.has(item.id) ? 'selected' : ''}`}>
                    <input
                        type="checkbox"
                        className="cat-row-checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                    />
                    {editingId === item.id ? (
                        <input
                            className="category-rename-input"
                            value={editValue}
                            autoFocus
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleRename(item)
                                if (e.key === 'Escape') setEditingId(null)
                            }}
                        />
                    ) : (
                        <span className={`category-name tag tag-${color}`}>{item.name}</span>
                    )}

                    <span className="category-count">
                        {item._count > 0
                            ? `${item._count} testimonial${item._count !== 1 ? 's' : ''}`
                            : <em className="cat-unused">unused</em>
                        }
                    </span>

                    <div className="category-actions">
                        {editingId === item.id ? (
                            <>
                                <button className="cat-btn save" onClick={() => handleRename(item)} disabled={saving}>
                                    <Check size={13} /> Save
                                </button>
                                <button className="cat-btn cancel" onClick={() => setEditingId(null)}>
                                    <X size={13} /> Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="cat-btn edit" onClick={() => startEdit(item)}>
                                    <Pencil size={13} /> Rename
                                </button>
                                <button className="cat-btn delete" onClick={() => handleDelete(item)}>
                                    <Trash2 size={13} /> Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Categories() {
    return (
        <div className="admin-page-content">
            <h2><Tag size={20} /> Categories</h2>
            <p className="page-sub">
                Manage health conditions and products used across all testimonials,
                the submission form, and the navigation menu. Changes apply everywhere instantly.
            </p>
            <div className="categories-grid">
                <CategorySection title="Health Conditions" table="conditions" color="condition" />
                <CategorySection title="Products"          table="products"   color="product" fuzzy={false} />
            </div>
        </div>
    )
}
