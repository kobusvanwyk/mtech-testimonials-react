import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Categories() {
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingCondition, setEditingCondition] = useState(null)
    const [editingProduct, setEditingProduct] = useState(null)
    const [renameValue, setRenameValue] = useState('')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => { fetchAll() }, [])

    async function fetchAll() {
        const { data } = await supabase.from('testimonials').select('id, conditions, products')
        setTestimonials(data || [])
        setLoading(false)
    }

    // Build unique conditions with usage counts
    const conditionMap = {}
    testimonials.forEach(t => {
        (t.conditions || []).forEach(c => {
            conditionMap[c] = (conditionMap[c] || 0) + 1
        })
    })

    // Build unique products with usage counts
    const productMap = {}
    testimonials.forEach(t => {
        (t.products || []).forEach(p => {
            productMap[p] = (productMap[p] || 0) + 1
        })
    })

    const conditions = Object.entries(conditionMap).sort((a, b) => b[1] - a[1])
    const products = Object.entries(productMap).sort((a, b) => b[1] - a[1])

    async function renameCategory(type, oldName, newName) {
        if (!newName.trim() || newName.trim() === oldName) {
            setEditingCondition(null)
            setEditingProduct(null)
            return
        }
        setSaving(true)
        const field = type === 'condition' ? 'conditions' : 'products'

        // Find all testimonials that use this category
        const affected = testimonials.filter(t => (t[field] || []).includes(oldName))

        // Update each one
        for (const t of affected) {
            const updated = t[field].map(x => x === oldName ? newName.trim() : x)
            await supabase.from('testimonials').update({ [field]: updated }).eq('id', t.id)
        }

        setMessage(`Renamed "${oldName}" → "${newName.trim()}" on ${affected.length} testimonial(s)`)
        setTimeout(() => setMessage(''), 4000)
        setEditingCondition(null)
        setEditingProduct(null)
        fetchAll()
        setSaving(false)
    }

    async function deleteCategory(type, name) {
        const field = type === 'condition' ? 'conditions' : 'products'
        const affected = testimonials.filter(t => (t[field] || []).includes(name))
        if (!window.confirm(`Remove "${name}" from ${affected.length} testimonial(s)? This cannot be undone.`)) return

        setSaving(true)
        for (const t of affected) {
            const updated = (t[field] || []).filter(x => x !== name)
            await supabase.from('testimonials').update({ [field]: updated }).eq('id', t.id)
        }
        setMessage(`Deleted "${name}" from ${affected.length} testimonial(s)`)
        setTimeout(() => setMessage(''), 4000)
        fetchAll()
        setSaving(false)
    }

    function startEdit(type, name) {
        setRenameValue(name)
        if (type === 'condition') { setEditingCondition(name); setEditingProduct(null) }
        else { setEditingProduct(name); setEditingCondition(null) }
    }

    function CategoryRow({ type, name, count }) {
        const isEditing = type === 'condition' ? editingCondition === name : editingProduct === name
        return (
            <div className="category-row">
                {isEditing ? (
                    <input
                        className="category-rename-input"
                        value={renameValue}
                        autoFocus
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') renameCategory(type, name, renameValue)
                            if (e.key === 'Escape') { setEditingCondition(null); setEditingProduct(null) }
                        }}
                    />
                ) : (
                    <span className={`category-name ${type === 'condition' ? 'tag-condition' : 'tag-product'}`}>{name}</span>
                )}
                <span className="category-count">{count} testimonial{count !== 1 ? 's' : ''}</span>
                <div className="category-actions">
                    {isEditing ? (
                        <>
                            <button className="cat-btn save" onClick={() => renameCategory(type, name, renameValue)} disabled={saving}>Save</button>
                            <button className="cat-btn cancel" onClick={() => { setEditingCondition(null); setEditingProduct(null) }}>Cancel</button>
                        </>
                    ) : (
                        <>
                            <button className="cat-btn edit" onClick={() => startEdit(type, name)}>Rename</button>
                            <button className="cat-btn delete" onClick={() => deleteCategory(type, name)}>Delete</button>
                        </>
                    )}
                </div>
            </div>
        )
    }

    if (loading) return <div className="admin-page-content"><div className="loading">Loading...</div></div>

    return (
        <div className="admin-page-content">
            <h2>🏷️ Categories</h2>
            <p className="page-sub">Rename or delete condition and product tags used across all testimonials. Changes apply to every testimonial using that tag.</p>

            {message && <div className="cat-message">{message}</div>}

            <div className="categories-grid">
                <div className="edit-section">
                    <h3 className="cat-section-title">Health Conditions <span className="cat-total">({conditions.length})</span></h3>
                    {conditions.length === 0 ? (
                        <p className="table-empty">No conditions yet.</p>
                    ) : (
                        conditions.map(([name, count]) => (
                            <CategoryRow key={name} type="condition" name={name} count={count} />
                        ))
                    )}
                </div>

                <div className="edit-section">
                    <h3 className="cat-section-title">Products <span className="cat-total">({products.length})</span></h3>
                    {products.length === 0 ? (
                        <p className="table-empty">No products yet.</p>
                    ) : (
                        products.map(([name, count]) => (
                            <CategoryRow key={name} type="product" name={name} count={count} />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
