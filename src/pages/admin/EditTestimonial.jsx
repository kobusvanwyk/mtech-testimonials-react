import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, ArrowRight, Eye, Check, X } from 'lucide-react'

const PRODUCTS = [
    'Ambrotose Complex', 'Advanced Ambrotose', 'Ambrotose AO',
    'NutriVerus', 'Catalyst', 'Manapol', 'PLUS', 'OsoLean',
    'GI-ProBalance', 'ImmunoSTART', 'BounceBack',
    'Superfood Greens and Reds', 'TruPLENISH', 'Cardio Balance', 'Omega 3'
]

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Published' },
    { value: 'unpublished', label: 'Unpublished' },
    { value: 'needs_editing', label: 'Needs Editing' },
    { value: 'rejected', label: 'Rejected' },
]

export default function EditTestimonial() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [conditionInput, setConditionInput] = useState('')
    const [newFeaturedImage, setNewFeaturedImage] = useState(null)
    const [newGalleryImages, setNewGalleryImages] = useState([])
    const [form, setForm] = useState(null)

    useEffect(() => { fetchTestimonial() }, [id])

    async function fetchTestimonial() {
        const { data } = await supabase.from('testimonials').select('*').eq('id', id).single()
        if (data) setForm(data)
        setLoading(false)
    }

    function update(field, value) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    function addCondition() {
        const val = conditionInput.trim()
        if (val && !form.conditions?.includes(val)) {
            update('conditions', [...(form.conditions || []), val])
        }
        setConditionInput('')
    }

    function removeCondition(c) {
        update('conditions', form.conditions.filter(x => x !== c))
    }

    function toggleProduct(p) {
        const current = form.products || []
        update('products', current.includes(p) ? current.filter(x => x !== p) : [...current, p])
    }

    function removeGalleryImage(url) {
        update('gallery_urls', (form.gallery_urls || []).filter(u => u !== url))
    }

    function moveGalleryImage(index, direction) {
        const arr = [...(form.gallery_urls || [])]
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= arr.length) return
        ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
        update('gallery_urls', arr)
    }

    async function uploadImage(file, folder) {
        const ext = file.name.split('.').pop()
        const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('testimonial-images').upload(filename, file)
        if (error) throw error
        const { data } = supabase.storage.from('testimonial-images').getPublicUrl(filename)
        return data.publicUrl
    }

    async function handleSave() {
        setSaving(true)
        try {
            let updates = { ...form }

            if (newFeaturedImage) {
                updates.featured_image_url = await uploadImage(newFeaturedImage, 'featured')
            }

            if (newGalleryImages.length > 0) {
                const newUrls = await Promise.all(newGalleryImages.map(f => uploadImage(f, 'gallery')))
                updates.gallery_urls = [...(form.gallery_urls || []), ...newUrls]
            }

            const historyEntry = { at: new Date().toISOString(), note: `Status: ${updates.status}` }
            updates.edit_history = [...(form.edit_history || []), historyEntry]

            delete updates.id
            delete updates.created_at

            const { error } = await supabase.from('testimonials').update(updates).eq('id', id)
            if (error) throw error

            setSaved(true)
            setNewFeaturedImage(null)
            setNewGalleryImages([])
            setTimeout(() => setSaved(false), 3000)
            fetchTestimonial()
        } catch (err) {
            alert('Error saving. Please try again.')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="admin-page-content"><div className="loading">Loading...</div></div>
    if (!form) return <div className="admin-page-content"><p>Testimonial not found.</p></div>

    const saveLabel = saving ? 'Saving...' : saved ? <><Check size={14} /> Saved!</> : 'Save Changes'

    return (
        <div className="admin-page-content">
            <div className="edit-header">
                <Link to="/admin/all" className="back-link"><ArrowLeft size={15} /> Back</Link>
                <h2>Edit Testimonial</h2>
                <div className="edit-header-actions">
                    <Link to={`/testimonial/${id}`} target="_blank" className="btn-preview">
                        <Eye size={14} /> Preview
                    </Link>
                    <button className="btn-save" onClick={handleSave} disabled={saving}>{saveLabel}</button>
                </div>
            </div>

            <div className="edit-grid">
                {/* LEFT COLUMN */}
                <div className="edit-main">
                    <div className="edit-section">
                        <label className="edit-label">Title</label>
                        <input className="edit-input" value={form.title || ''} onChange={e => update('title', e.target.value)} />
                    </div>

                    <div className="edit-section">
                        <label className="edit-label">Author Name</label>
                        <div className="edit-row">
                            <input className="edit-input" value={form.person_name || ''} onChange={e => update('person_name', e.target.value)} disabled={form.anonymous} placeholder={form.anonymous ? 'Anonymous submission' : 'Author name'} />
                            <label className="edit-checkbox-label">
                                <input type="checkbox" checked={form.anonymous || false} onChange={e => update('anonymous', e.target.checked)} />
                                Anonymous
                            </label>
                        </div>
                    </div>

                    <div className="edit-section">
                        <label className="edit-label">Story</label>
                        <textarea className="edit-textarea" value={form.story_text || ''} onChange={e => update('story_text', e.target.value)} rows={12} />
                    </div>

                    <div className="edit-section">
                        <label className="edit-label">Health Conditions</label>
                        <div className="tag-input-area">
                            {(form.conditions || []).map(c => (
                                <span key={c} className="tag-pill">
                                    {c} <button onClick={() => removeCondition(c)}><X size={10} /></button>
                                </span>
                            ))}
                            <input
                                className="tag-input"
                                type="text"
                                placeholder="Add condition..."
                                value={conditionInput}
                                onChange={e => setConditionInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCondition() } }}
                            />
                        </div>
                    </div>

                    <div className="edit-section">
                        <label className="edit-label">Products</label>
                        <div className="products-grid">
                            {PRODUCTS.map(p => (
                                <label key={p} className={`product-option ${(form.products || []).includes(p) ? 'selected' : ''}`}>
                                    <input type="checkbox" checked={(form.products || []).includes(p)} onChange={() => toggleProduct(p)} />
                                    {p}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="edit-sidebar">
                    <div className="edit-section">
                        <label className="edit-label">Status</label>
                        <select className="edit-select" value={form.status} onChange={e => update('status', e.target.value)}>
                            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    <div className="edit-section">
                        <label className="edit-label">Featured Photo</label>
                        {form.featured_image_url && (
                            <div className="edit-image-preview">
                                <img src={form.featured_image_url} alt="Featured" />
                                <button className="remove-image" onClick={() => update('featured_image_url', null)}>
                                    <X size={13} /> Remove
                                </button>
                            </div>
                        )}
                        {newFeaturedImage && (
                            <div className="edit-image-preview">
                                <img src={URL.createObjectURL(newFeaturedImage)} alt="New featured" />
                                <p className="upload-hint">New image (not saved yet)</p>
                                <button className="remove-image" onClick={() => setNewFeaturedImage(null)}>
                                    <X size={13} /> Cancel
                                </button>
                            </div>
                        )}
                        <input type="file" accept="image/*" onChange={e => setNewFeaturedImage(e.target.files[0])} className="file-input" />
                    </div>

                    <div className="edit-section">
                        <label className="edit-label">Gallery Photos</label>
                        {(form.gallery_urls || []).length > 0 && (
                            <div className="gallery-manage">
                                {(form.gallery_urls || []).map((url, i) => (
                                    <div key={url} className="gallery-manage-item">
                                        <img src={url} alt={`Gallery ${i + 1}`} />
                                        <div className="gallery-manage-actions">
                                            <button onClick={() => moveGalleryImage(i, -1)} disabled={i === 0} title="Move left"><ArrowLeft size={13} /></button>
                                            <button onClick={() => moveGalleryImage(i, 1)} disabled={i === (form.gallery_urls.length - 1)} title="Move right"><ArrowRight size={13} /></button>
                                            <button onClick={() => removeGalleryImage(url)} className="btn-remove-gallery" title="Remove"><X size={13} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <input type="file" accept="image/*" multiple onChange={e => setNewGalleryImages(Array.from(e.target.files))} className="file-input" />
                        {newGalleryImages.length > 0 && <p className="upload-hint">{newGalleryImages.length} new photo(s) to add (not saved yet)</p>}
                    </div>

                    <div className="edit-section">
                        <label className="edit-label">Edit History</label>
                        {(form.edit_history || []).length === 0 ? (
                            <p className="edit-meta">No edits yet.</p>
                        ) : (
                            <div className="edit-history-list">
                                {[...(form.edit_history || [])].reverse().map((entry, i) => (
                                    <div key={i} className="edit-history-item">
                                        <span className="edit-history-date">
                                            {new Date(entry.at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {' '}
                                            {new Date(entry.at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="edit-history-note">{entry.note}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="edit-section">
                        <label className="edit-label">Submitted</label>
                        <p className="edit-meta">{new Date(form.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            <div className="edit-footer">
                <button className="btn-save" onClick={handleSave} disabled={saving}>{saveLabel}</button>
            </div>
        </div>
    )
}
