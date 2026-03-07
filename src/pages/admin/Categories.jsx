import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Tag, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

// ── Reusable section for managing a DB-backed list ────────────────────────────
function CategorySection({ title, table, color }) {
    const [items, setItems]         = useState([])  // { id, name, active, sort_order, _count }
    const [loading, setLoading]     = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [addValue, setAddValue]   = useState('')
    const [adding, setAdding]       = useState(false)
    const [saving, setSaving]       = useState(false)
    const [message, setMessage]     = useState(null)  // { text, type: 'success'|'error' }
    const addInputRef = useRef()

    useEffect(() => { fetchItems() }, [])

    async function fetchItems() {
        // Fetch items from their own table
        const { data: tableData } = await supabase
            .from(table)
            .select('id, name, active, sort_order')
            .order('sort_order')
            .order('name')

        // Count how many testimonials use each item
        const { data: testimonials } = await supabase
            .from('testimonials')
            .select(`${table === 'products' ? 'products' : 'conditions'}`)

        const countMap = {}
        ;(testimonials || []).forEach(t => {
            const field = table === 'products' ? t.products : t.conditions
            ;(field || []).forEach(v => { countMap[v] = (countMap[v] || 0) + 1 })
        })

        setItems((tableData || []).map(item => ({ ...item, _count: countMap[item.name] || 0 })))
        setLoading(false)
    }

    function flash(text, type = 'success') {
        setMessage({ text, type })
        setTimeout(() => setMessage(null), 4000)
    }

    async function handleAdd() {
        const name = addValue.trim()
        if (!name) return
        setSaving(true)
        const { error } = await supabase.from(table).insert({ name, active: true, sort_order: 0 })
        if (error) {
            flash(error.message.includes('unique') ? `"${name}" already exists.` : error.message, 'error')
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
        setSaving(true)

        // 1. Update the master table
        const { error } = await supabase.from(table).update({ name }).eq('id', item.id)
        if (error) { flash(error.message, 'error'); setSaving(false); return }

        // 2. Update the name in all testimonials that use it
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
        const label = table === 'products' ? 'product' : 'condition'
        if (!window.confirm(
            item._count > 0
                ? `Remove "${item.name}" from ${item._count} testimonial(s) and delete it? This cannot be undone.`
                : `Delete "${item.name}"? This cannot be undone.`
        )) return

        setSaving(true)

        // Remove from testimonials if used
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

        // Delete from master table
        await supabase.from(table).delete().eq('id', item.id)
        flash(`Deleted "${item.name}"`)
        fetchItems()
        setSaving(false)
    }

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
                <CategorySection
                    title="Health Conditions"
                    table="conditions"
                    color="condition"
                />
                <CategorySection
                    title="Products"
                    table="products"
                    color="product"
                />
            </div>
        </div>
    )
}
