import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProducts } from '../lib/ProductsContext'
import { generateUniqueSlug } from '../lib/slugify'
import { ArrowLeft, ArrowRight, X, Check, Sparkles, Image } from 'lucide-react'

export default function Submit() {
    const PRODUCTS = useProducts()
    const [step, setStep] = useState(1)
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [featuredImage, setFeaturedImage] = useState(null)
    const [galleryImages, setGalleryImages] = useState([])
    const [uploadProgress, setUploadProgress] = useState('')
    const [terms, setTerms] = useState({ tc: false, privacy: false, consent: false })
    const allTermsAccepted = terms.tc && terms.privacy && terms.consent
    const [honeypot, setHoneypot] = useState('')
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

    function validateFiles(files) {
        const allowed = ['image/jpeg', 'image/png']
        const maxSize = 3 * 1024 * 1024 // 3MB
        const valid = []
        const errors = []
        files.forEach(f => {
            if (!allowed.includes(f.type)) errors.push(`${f.name}: only JPG or PNG allowed`)
            else if (f.size > maxSize) errors.push(`${f.name}: exceeds 3MB limit`)
            else valid.push(f)
        })
        if (errors.length) alert(errors.join('\n'))
        return valid
    }

    function handleFeaturedImageChange(e) {
        const file = e.target.files[0]
        if (!file) return
        const valid = validateFiles([file])
        if (valid.length) setFeaturedImage(valid[0])
    }

    function handleFeaturedDrop(e) {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (!file) return
        const valid = validateFiles([file])
        if (valid.length) setFeaturedImage(valid[0])
    }

    function handleGalleryChange(e) {
        const files = validateFiles(Array.from(e.target.files))
        const combined = [...galleryImages, ...files].slice(0, 8)
        setGalleryImages(combined)
    }

    function handleGalleryDrop(e) {
        e.preventDefault()
        const files = validateFiles(Array.from(e.dataTransfer.files))
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
        // Honeypot check — bots fill this, humans don't
        if (honeypot) {
            setSubmitted(true) // Silently pretend it succeeded
            return
        }
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
            const slug = await generateUniqueSlug(form.title)
            const { error } = await supabase.from('testimonials').insert([{
                title: form.title,
                slug,
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
                    {[1, 2, 3, 4, 5, 6, 7].map((n, i) => (
                        <>
                            <div
                                key={n}
                                className={`step-dot ${step === n ? 'active' : step > n ? 'completed' : ''}`}
                                onClick={() => step > n && setStep(n)}
                                title={step > n ? `Go back to step ${n}` : undefined}
                            >
                                {step > n ? <Check size={14} /> : n}
                            </div>
                            {i < 6 && (
                                <div key={`c${n}`} className={`step-connector ${step > n ? 'completed' : ''}`} />
                            )}
                        </>
                    ))}
                </div>
                <p className="step-counter">Step {step} of 7</p>

                {/* Honeypot — hidden from real users, bots will fill it */}
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                    <label htmlFor="website">Website</label>
                    <input
                        id="website"
                        name="website"
                        type="text"
                        value={honeypot}
                        onChange={e => setHoneypot(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                    />
                </div>

                {/* STEP 1 */}
                {step === 1 && (
                    <div className="step">
                        <h2>Share a success story</h2>
                        <p className="step-desc">Give the story a short descriptive title that highlights the main benefit or outcome.</p>

                        <label className="form-label">Story title</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="e.g. Ambrotose helped my Arthritis"
                            value={form.title}
                            onChange={e => updateForm('title', e.target.value)}
                            maxLength={120}
                        />

                        <div
                            className={`anonymous-toggle ${form.anonymous ? 'is-on' : ''}`}
                            onClick={() => updateForm('anonymous', !form.anonymous)}
                        >
                            <div className="toggle-text">
                                <strong>Submit anonymously</strong>
                                <span>The person's name will be hidden from public view</span>
                            </div>
                            <div className={`toggle-switch ${form.anonymous ? 'on' : ''}`} />
                        </div>

                        {!form.anonymous && (
                            <>
                                <label className="form-label">Full name</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="e.g. Maria van der Berg"
                                    value={form.person_name}
                                    onChange={e => updateForm('person_name', e.target.value)}
                                />
                            </>
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
                        <label className="form-label">Health conditions</label>
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
                        <label className="form-label">Your story</label>
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
                        <h2>Add photos</h2>
                        <p className="step-desc">A photo makes your story more personal. You can skip this step.</p>

                        {/* Featured photo dropzone */}
                        <label className="form-label">Featured photo</label>
                        <p className="upload-hint">This is the main image shown on your story card.</p>
                        {!featuredImage ? (
                            <label
                                className="dropzone"
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleFeaturedDrop}
                            >
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    onChange={handleFeaturedImageChange}
                                    className="dropzone-input"
                                />
                                <Image size={32} className="dropzone-icon" />
                                <span className="dropzone-main">Tap to add a photo</span>
                                <span className="dropzone-sub">or drag and drop</span>
                                <span className="dropzone-hint">JPG or PNG · Max 3MB</span>
                            </label>
                        ) : (
                            <div className="image-preview">
                                <img src={URL.createObjectURL(featuredImage)} alt="Featured preview" />
                                <button className="remove-image" onClick={() => setFeaturedImage(null)}>
                                    <X size={13} /> Remove
                                </button>
                            </div>
                        )}

                        {/* Gallery dropzone */}
                        <label className="form-label" style={{ marginTop: '24px' }}>Gallery photos</label>
                        <p className="upload-hint">Extra photos shown on the full story page.</p>
                        {galleryImages.length < 8 && (
                            <label
                                className="dropzone"
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleGalleryDrop}
                            >
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    multiple
                                    onChange={handleGalleryChange}
                                    className="dropzone-input"
                                />
                                <Image size={32} className="dropzone-icon" />
                                <span className="dropzone-main">Tap to add photos</span>
                                <span className="dropzone-sub">or browse your device</span>
                                <span className="dropzone-hint">JPG or PNG · Max 3MB each · Up to 8 photos</span>
                            </label>
                        )}
                        {galleryImages.length > 0 && (
                            <>
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
                                <p className="upload-count">{galleryImages.length}/8 photos added</p>
                            </>
                        )}

                        <div className="step-nav">
                            <button className="btn-back" onClick={() => setStep(4)}><ArrowLeft size={15} /> Back</button>
                            <button className="btn-next" onClick={() => setStep(6)}>
                                Next <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 6 — TERMS */}
                {step === 6 && (
                    <div className="step">
                        <h2>Before you submit...</h2>
                        <p className="step-desc">Please review and accept the following:</p>

                        <div className="terms-list">
                            <label className={`terms-item ${terms.tc ? 'checked' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={terms.tc}
                                    onChange={e => setTerms(t => ({ ...t, tc: e.target.checked }))}
                                />
                                <div className="terms-checkbox">{terms.tc && <Check size={12} />}</div>
                                <span>I have read and agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</a></span>
                            </label>

                            <label className={`terms-item ${terms.privacy ? 'checked' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={terms.privacy}
                                    onChange={e => setTerms(t => ({ ...t, privacy: e.target.checked }))}
                                />
                                <div className="terms-checkbox">{terms.privacy && <Check size={12} />}</div>
                                <span>I have read and understand the <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a></span>
                            </label>

                            <label className={`terms-item ${terms.consent ? 'checked' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={terms.consent}
                                    onChange={e => setTerms(t => ({ ...t, consent: e.target.checked }))}
                                />
                                <div className="terms-checkbox">{terms.consent && <Check size={12} />}</div>
                                <span>I consent to the collection and use of my information as described</span>
                            </label>
                        </div>

                        <div className="step-nav">
                            <button className="btn-back" onClick={() => setStep(5)}><ArrowLeft size={15} /> Back</button>
                            <button
                                className="btn-next"
                                disabled={!allTermsAccepted}
                                onClick={() => setStep(7)}
                            >
                                Next <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 7 — REVIEW */}
                {step === 7 && (
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
                            <button className="btn-back" onClick={() => setStep(6)}><ArrowLeft size={15} /> Back</button>
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
