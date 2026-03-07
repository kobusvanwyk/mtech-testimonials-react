import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Tag, Plus, Pencil, Trash2, Check, X, GitMerge } from 'lucide-react'

// ── Merge warning banner ──────────────────────────────────────────────────────
function MergeWarning({ duplicateGroups, onMerge }) {
    if (!duplicateGroups.length) return null
    return (
        <div className="merge-warning">
            <strong>⚠ Duplicate conditions detected</strong>
            <p>The following conditions appear to be the same (different capitalisation). Use Merge to combine them into one.</p>
            {duplicateGroups.map(group => (
                <MergeGroup key={group[0].name} group={group} onMerge={onMerge} />
            ))}
        </div>
    )
}

function MergeGroup({ group, onMerge }) {
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
            <button className="merge-btn" onClick={() => onMerge(group, winner)}>
                <GitMerge size={13} /> Keep "{winner}"
            </button>
        </div>
    )
}

// ── Reusable section ──────────────────────────────────────────────────────────
function CategorySection({ title, table, color, onDataChange }) {
    const [items, setItems]         = useState([])
    const [loading, setLoading]     = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [addValue, setAddValue]   = useState('')
    const [adding, setAdding]       = useState(false)
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
            fetchItems()
        }
        setSaving(false)
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

    // Detect case-insensitive duplicate groups (conditions only for now, but works for both)
    const duplicateGroups = (() => {
        const grouped = {}
        items.forEach(item => {
            const key = item.name.toLowerCase()
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(item)
        })
        return Object.values(grouped).filter(g => g.length > 1)
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
                <h3 className="cat-section-title">
                    {title} <span className="cat-total">({items.length})</span>
                </h3>
                <button className="cat-add-btn" onClick={startAdd}>
                    <Plus size={14} /> Add
                </button>
            </div>

            {/* Merge warnings */}
            <MergeWarning duplicateGroups={duplicateGroups} onMerge={handleMerge} />

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
                <div key={item.id} className="category-row">
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
                <CategorySection title="Products"          table="products"   color="product"   />
            </div>
        </div>
    )
}
