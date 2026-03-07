import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, ArrowRight, X, Check, Sparkles } from 'lucide-react'

const PRODUCTS = [
    'Ambrotose Complex', 'Advanced Ambrotose', 'Ambrotose AO',
    'NutriVerus', 'Catalyst', 'Manapol', 'PLUS', 'OsoLean',
    'GI-ProBalance', 'ImmunoSTART', 'BounceBack',
    'Superfood Greens and Reds', 'TruPLENISH', 'Cardio Balance', 'Omega 3'
]

export default function Submit() {
    const [step, setStep] = useState(1)
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [featuredImage, setFeaturedImage] = useState(null)
    const [galleryImages, setGalleryImages] = useState([])
    const [uploadProgress, setUploadProgress] = useState('')
    const [form, setForm] = useState({
        title: '',
        person_name: '',
        anonymous: false,
        conditions: [],
        products: [],
        story_text: '',
        conditionInput: ''
    })

    function updateForm(field, value) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    function addCondition() {
        const val = form.conditionInput.trim()
        if (val && !form.conditions.includes(val)) {
            updateForm('conditions', [...form.conditions, val])
        }
        updateForm('conditionInput', '')
    }

    function removeCondition(c) {
        updateForm('conditions', form.conditions.filter(x => x !== c))
    }

    function toggleProduct(p) {
        const updated = form.products.includes(p)
            ? form.products.filter(x => x !== p)
            : [...form.products, p]
        updateForm('products', updated)
    }

    function handleFeaturedImageChange(e) {
        const file = e.target.files[0]
        if (file) setFeaturedImage(file)
    }

    function handleGalleryChange(e) {
        const files = Array.from(e.target.files)
        const combined = [...galleryImages, ...files].slice(0, 8)
        setGalleryImages(combined)
    }

    function removeGalleryImage(index) {
        setGalleryImages(prev => prev.filter((_, i) => i !== index))
    }

    async function uploadImage(file, folder) {
        const ext = file.name.split('.').pop()
        const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data, error } = await supabase.storage
            .from('testimonial-images')
            .upload(filename, file)
        if (error) throw error
        const { data: urlData } = supabase.storage
            .from('testimonial-images')
            .getPublicUrl(filename)
        return urlData.publicUrl
    }

    async function handleSubmit() {
        setLoading(true)
        try {
            let featured_image_url = null
            let gallery_urls = []

            if (featuredImage) {
                setUploadProgress('Uploading featured image...')
                featured_image_url = await uploadImage(featuredImage, 'featured')
            }

            if (galleryImages.length > 0) {
                setUploadProgress(`Uploading ${galleryImages.length} gallery image(s)...`)
                gallery_urls = await Promise.all(
                    galleryImages.map(img => uploadImage(img, 'gallery'))
                )
            }

            setUploadProgress('Saving your story...')
            const { error } = await supabase.from('testimonials').insert([{
                title: form.title,
                person_name: form.anonymous ? null : form.person_name,
                anonymous: form.anonymous,
                conditions: form.conditions,
                products: form.products,
                story_text: form.story_text,
                featured_image_url,
                gallery_urls,
                status: 'pending'
            }])

            if (error) throw error
            setSubmitted(true)
        } catch (err) {
            alert('Something went wrong. Please try again.')
            console.error(err)
        } finally {
            setLoading(false)
            setUploadProgress('')
        }
    }

    if (submitted) {
        return (
            <div className="submit-success">
                <div className="success-icon"><Sparkles size={48} /></div>
                <h2>Thank you for sharing your story!</h2>
                <p>Your testimonial has been submitted and will be reviewed before publishing.</p>
            </div>
        )
    }

    return (
        <div className="submit-page">
            <div className="submit-container">
                <div className="step-progress">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                        <div key={n} className={`step-dot ${step >= n ? 'active' : ''}`} />
                    ))}
                </div>
                <p className="step-counter">Step {step} of 6</p>

                {/* STEP 1 */}
                {step === 1 && (
                    <div className="step">
                        <h2>Share a success story</h2>
                        <p className="step-desc">Give the story a short descriptive title that highlights the main benefit or outcome.</p>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="e.g. Ambrotose helped my Arthritis"
                            value={form.title}
                            onChange={e => updateForm('title', e.target.value)}
                            maxLength={120}
                        />
                        <div className="anonymous-toggle">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={form.anonymous}
                                    onChange={e => updateForm('anonymous', e.target.checked)}
                                />
                                &nbsp; Submit anonymously
                            </label>
                            <p>The person's name will be hidden from public view</p>
                        </div>
                        {!form.anonymous && (
                            <input
                                className="form-input"
                                type="text"
                                placeholder="e.g. Maria van der Berg"
                                value={form.person_name}
                                onChange={e => updateForm('person_name', e.target.value)}
                            />
                        )}
                        <button
                            className="btn-next"
                            disabled={!form.title || (!form.anonymous && !form.person_name)}
                            onClick={() => setStep(2)}
                        >
                            Continue <ArrowRight size={15} />
                        </button>
                    </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <div className="step">
                        <h2>Which health condition(s) does this relate to?</h2>
                        <p className="step-desc">Type a condition and press Enter or comma to add it. Add as many as you like.</p>
                        <div className="tag-input-area">
                            {form.conditions.map(c => (
                                <span key={c} className="tag-pill">
                                    {c} <button onClick={() => removeCondition(c)}><X size={10} /></button>
                                </span>
                            ))}
                            <input
                                className="tag-input"
                                type="text"
                                placeholder="e.g. High blood pressure"
                                value={form.conditionInput}
                                onChange={e => updateForm('conditionInput', e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault()
                                        addCondition()
                                    }
                                }}
                            />
                        </div>
                        <div className="step-nav">
                            <button className="btn-back" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</button>
                            <button
                                className="btn-next"
                                disabled={form.conditions.length === 0}
                                onClick={() => setStep(3)}
                            >
                                Next <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                    <div className="step">
                        <h2>Which Mannatech products helped them?</h2>
                        <p className="step-desc">Select all that apply. You can choose more than one.</p>
                        <div className="products-grid">
                            {PRODUCTS.map(p => (
                                <label
                                    key={p}
                                    className={`product-option ${form.products.includes(p) ? 'selected' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.products.includes(p)}
                                        onChange={() => toggleProduct(p)}
                                    />
                                    {p}
                                </label>
                            ))}
                        </div>
                        <div className="step-nav">
                            <button className="btn-back" onClick={() => setStep(2)}><ArrowLeft size={15} /> Back</button>
                            <button
                                className="btn-next"
                                disabled={form.products.length === 0}
                                onClick={() => setStep(4)}
                            >
                                Next <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4 */}
                {step === 4 && (
                    <div className="step">
                        <h2>Tell the story</h2>
                        <p className="step-desc">Write in your own words. What happened? How did it help?</p>
                        <textarea
                            className="form-textarea"
                            placeholder="Start typing your story here..."
                            value={form.story_text}
                            onChange={e => updateForm('story_text', e.target.value)}
                            rows={10}
                        />
                        <p className="char-count">{form.story_text.length} characters</p>
                        <div className="step-nav">
                            <button className="btn-back" onClick={() => setStep(3)}><ArrowLeft size={15} /> Back</button>
                            <button
                                className="btn-next"
                                disabled={form.story_text.length < 50}
                                onClick={() => setStep(5)}
                            >
                                Next <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5 */}
                {step === 5 && (
                    <div className="step">
                        <h2>Almost done!</h2>
                        <p className="step-desc">A photo makes your story more personal. You can skip this step.</p>

                        <div className="image-upload-section">
                            <label className="upload-label">Featured Photo</label>
                            <p className="upload-hint">This is the main image shown on your story card.</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFeaturedImageChange}
                                className="file-input"
                            />
                            {featuredImage && (
                                <div className="image-preview">
                                    <img src={URL.createObjectURL(featuredImage)} alt="Featured preview" />
                                    <button className="remove-image" onClick={() => setFeaturedImage(null)}>
                                        <X size={13} /> Remove
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="image-upload-section">
                            <label className="upload-label">Gallery Photos (up to 8)</label>
                            <p className="upload-hint">Extra photos shown on the full story page.</p>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleGalleryChange}
                                className="file-input"
                                disabled={galleryImages.length >= 8}
                            />
                            {galleryImages.length > 0 && (
                                <div className="gallery-preview">
                                    {galleryImages.map((img, i) => (
                                        <div key={i} className="gallery-preview-item">
                                            <img src={URL.createObjectURL(img)} alt={`Gallery ${i + 1}`} />
                                            <button className="remove-image" onClick={() => removeGalleryImage(i)}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="upload-count">{galleryImages.length}/8 photos added</p>
                        </div>

                        <div className="step-nav">
                            <button className="btn-back" onClick={() => setStep(4)}><ArrowLeft size={15} /> Back</button>
                            <button className="btn-next" onClick={() => setStep(6)}>
                                {featuredImage || galleryImages.length > 0 ? <>Next <ArrowRight size={15} /></> : <>Next <ArrowRight size={15} /></>}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 6 */}
                {step === 6 && (
                    <div className="step">
                        <h2>Review your story</h2>
                        <div className="review-card">
                            <h3>{form.title}</h3>
                            <p><strong>By:</strong> {form.anonymous ? 'Anonymous' : form.person_name}</p>
                            <p><strong>Conditions:</strong> {form.conditions.join(', ')}</p>
                            <p><strong>Products:</strong> {form.products.join(', ')}</p>
                            {featuredImage && <p><strong>Featured photo:</strong> <Check size={13} /> Added</p>}
                            {galleryImages.length > 0 && <p><strong>Gallery photos:</strong> {galleryImages.length} added</p>}
                            <p><strong>Story:</strong></p>
                            <p className="review-story">{form.story_text}</p>
                        </div>
                        {uploadProgress && <p className="upload-progress">{uploadProgress}</p>}
                        <div className="step-nav">
                            <button className="btn-back" onClick={() => setStep(5)}><ArrowLeft size={15} /> Back</button>
                            <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Submitting...' : <><Check size={15} /> Submit Testimonial</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
