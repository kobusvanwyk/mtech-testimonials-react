import React, { useState, useEffect, useRef } from 'react'
import { useToast } from '../lib/feedback'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProducts, useConditions } from '../lib/ProductsContext'
import { generateUniqueSlug } from '../lib/slugify'
import { ArrowLeft, ArrowRight, X, Check, CheckCircle2, Info } from 'lucide-react'

const STEP_LABELS = ['', 'Your details', 'Health condition', 'Products', 'Your testimonial', 'Photos', 'Consent', 'Review']

export default function Submit() {
    const toast = useToast()
    const PRODUCTS = useProducts()
    const ALL_CONDITIONS = useConditions()
    const [step, setStep] = useState(1)

    useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step])
    const [submitted, setSubmitted] = useState(false)
    // On success, move focus to the thank-you heading so screen readers announce it.
    const successRef = useRef(null)
    useEffect(() => { if (submitted) successRef.current?.focus({ preventScroll: true }) }, [submitted])
    const [loading, setLoading] = useState(false)
    const [galleryImages, setGalleryImages] = useState([])
    const [uploadProgress, setUploadProgress] = useState('')
    const [terms, setTerms] = useState({ tc: false, privacy: false, consent: false })
    const allTermsAccepted = terms.tc && terms.privacy && terms.consent
    const [honeypot, setHoneypot] = useState('')
    const [conditionText, setConditionText] = useState('')
    const [form, setForm] = useState({
        title: '',
        person_name: '',
        anonymous: false,
        conditions: [],
        products: [],
        story_text: '',
    })

    function updateForm(field, value) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    function parseConditions() {
        return conditionText
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
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
        errors.forEach(e => toast.error(e))
        return valid
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
        // Honeypot check, bots fill this, humans don't
        if (honeypot) {
            setSubmitted(true) // Silently pretend it succeeded
            return
        }
        setLoading(true)
        try {
            let gallery_urls = []

            if (galleryImages.length > 0) {
                setUploadProgress(`Uploading ${galleryImages.length} gallery image(s)...`)
                gallery_urls = await Promise.all(
                    galleryImages.map(img => uploadImage(img, 'gallery'))
                )
            }

            setUploadProgress('Saving your testimonial...')
            const slug = await generateUniqueSlug(form.title)
            const { error } = await supabase.from('testimonials').insert([{
                title: form.title,
                slug,
                person_name: form.anonymous ? null : form.person_name,
                anonymous: form.anonymous,
                conditions: form.conditions,
                products: form.products,
                story_text: form.story_text,
                gallery_urls,
                status: 'pending'
            }])

            if (error) throw error
            setSubmitted(true)
        } catch (err) {
            toast.error('Your testimonial could not be sent. Check your connection and try again. Nothing you typed has been lost.')
            console.error(err)
        } finally {
            setLoading(false)
            setUploadProgress('')
        }
    }

    if (submitted) {
        return (
            <div className="submit-success" role="status">
                <div className="success-icon" aria-hidden="true"><CheckCircle2 size={32} /></div>
                <h1 ref={successRef} tabIndex={-1}>Thank you, your testimonial is in</h1>
                <p>We review every testimonial before it goes live. Once it is approved, it will appear on the site for others to read.</p>
                <div className="submit-success-actions">
                    <Link to="/" className="btn-primary">Browse all testimonials</Link>
                    <button type="button" className="btn-secondary" onClick={() => {
                        setSubmitted(false)
                        setStep(1)
                        setForm({ title: '', person_name: '', anonymous: false, conditions: [], products: [], story_text: '' })
                        setConditionText('')
                        setGalleryImages([])
                        setTerms({ tc: false, privacy: false, consent: false })
                    }}>
                        Submit another
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="submit-page">
            <h1 className="sr-only">Share your testimonial</h1>
            <div className="submit-container">
                {/* Desktop: labelled node stepper (ui-guide "Submit stepper") */}
                <div className="step-progress">
                    {[1, 2, 3, 4, 5, 6, 7].map((n, i) => {
                        const state = step === n ? 'active' : step > n ? 'completed' : ''
                        return (
                            <React.Fragment key={n}>
                                <div className={`step-item ${state}`}>
                                    <div
                                        className={`step-dot ${state}`}
                                        onClick={() => step > n && setStep(n)}
                                        title={step > n ? `Go back to step ${n}` : undefined}
                                        aria-current={step === n ? 'step' : undefined}
                                    >
                                        {step > n ? <Check size={14} /> : n}
                                    </div>
                                    <span className="step-label">{STEP_LABELS[n]}</span>
                                </div>
                                {i < 6 && (
                                    <div className={`step-connector ${step > n ? 'completed' : ''}`} />
                                )}
                            </React.Fragment>
                        )
                    })}
                </div>

                {/* Mobile: progress bar */}
                {(() => {
                    const pct = Math.round(((step - 1) / 6) * 100)
                    return (
                        <div className="step-progress-mobile">
                            <div className="step-progress-bar-wrap">
                                <div className="step-progress-bar" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="step-progress-labels">
                                <span className="step-progress-current">{STEP_LABELS[step]}</span>
                                {step < 7 && (
                                    <span className="step-progress-next">Next: {STEP_LABELS[step + 1]}</span>
                                )}
                            </div>
                            <span className="step-progress-fraction">Step {step} of 7</span>
                        </div>
                    )
                })()}


                {/* Honeypot, hidden from real users, bots will fill it */}
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
                        <h2>Whose testimonial are you sharing?</h2>
                        <p className="step-desc"><Info size={16} className="step-desc-icon" /><span>You can submit your own experience, or on behalf of someone else, a family member, friend, or client. Give it a title that captures what happened.</span></p>

                        <label className="form-label" htmlFor="sub-title">Testimonial title</label>
                        <input
                            id="sub-title"
                            className="form-input"
                            type="text"
                            placeholder="e.g. How Ambrotose helped my arthritis"
                            value={form.title}
                            onChange={e => updateForm('title', e.target.value)}
                            maxLength={120}
                        />

                        <div
                            className={`anonymous-toggle ${form.anonymous ? 'is-on' : ''}`}
                            onClick={() => updateForm('anonymous', !form.anonymous)}
                        >
                            <div className="toggle-text">
                                <strong>Keep the name private</strong>
                                <span>The person's name won't appear publicly</span>
                            </div>
                            <div className={`toggle-switch ${form.anonymous ? 'on' : ''}`} />
                        </div>

                        {!form.anonymous && (
                            <>
                                <label className="form-label" htmlFor="sub-name">Full name</label>
                                <input
                                    id="sub-name"
                                    className="form-input"
                                    type="text"
                                    placeholder="e.g. Maria van der Berg"
                                    value={form.person_name}
                                    onChange={e => updateForm('person_name', e.target.value)}
                                />
                            </>
                        )}
                        <button
                            className="btn-primary"
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
                        <h2>What health challenge does this testimonial relate to?</h2>
                        <p className="step-desc"><Info size={16} className="step-desc-icon" /><span>Type the health condition(s) this testimonial relates to. If there is more than one, separate them with a comma, for example: <em>Diabetes, High Blood Pressure</em></span></p>
                        <label className="form-label" htmlFor="sub-conditions">Health conditions</label>
                        <input
                            id="sub-conditions"
                            className="form-input"
                            type="text"
                            placeholder="e.g. Diabetes, High Blood Pressure, Arthritis"
                            value={conditionText}
                            onChange={e => setConditionText(e.target.value)}
                            autoComplete="off"
                        />
                        <div className="step-nav">
                            <button className="btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</button>
                            <button
                                className="btn-primary"
                                disabled={!conditionText.trim()}
                                onClick={() => {
                                    updateForm('conditions', parseConditions())
                                    setStep(3)
                                }}
                            >
                                Next <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                    <div className="step">
                        <h2>Which Mannatech products made a difference?</h2>
                        <p className="step-desc"><Info size={16} className="step-desc-icon" /><span>Select everything that played a role, you can choose more than one.</span></p>
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
                                    <Check size={14} className="tick" aria-hidden="true" />
                                    {p}
                                </label>
                            ))}
                        </div>
                        <div className="step-nav">
                            <button className="btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={15} /> Back</button>
                            <button
                                className="btn-primary"
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
                        <h2>Tell us what happened</h2>
                        <p className="step-desc"><Info size={16} className="step-desc-icon" /><span>Write it the way you'd tell a friend. What was the health challenge? What changed after using the product? There's no right or wrong way, just be honest.</span></p>
                        <label className="form-label" htmlFor="sub-story">Your testimonial</label>
                        <textarea
                            id="sub-story"
                            className="form-textarea"
                            placeholder="Start typing the testimonial here..."
                            value={form.story_text}
                            onChange={e => updateForm('story_text', e.target.value)}
                            rows={10}
                        />
                        <p className="char-count">{form.story_text.length} characters</p>
                        <div className="step-nav">
                            <button className="btn-ghost" onClick={() => setStep(3)}><ArrowLeft size={15} /> Back</button>
                            <button
                                className="btn-primary"
                                disabled={!form.story_text.trim()}
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
                        <h2>Would you like to add photos?</h2>
                        <p className="step-desc"><Info size={16} className="step-desc-icon" /><span>A before/after photo or a picture of the person really brings the testimonial to life. This step is completely optional, just tap Next if you'd rather skip it.</span></p>

                        {/* Gallery dropzone */}
                        <p className="form-label">Gallery photos</p>
                        <p className="upload-hint">Extra photos shown on the full testimonial page.</p>
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
                                <svg className="dropzone-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="14" rx="2"/><circle cx="12" cy="13" r="3"/><path d="M8 6l1.5-2h5L16 6"/></svg>
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
                            <button className="btn-ghost" onClick={() => setStep(4)}><ArrowLeft size={15} /> Back</button>
                            <button className="btn-primary" onClick={() => setStep(6)}>
                                Next <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 6: TERMS */}
                {step === 6 && (
                    <div className="step">
                        <h2>Almost done, just one last thing</h2>
                        <p className="step-desc"><Info size={16} className="step-desc-icon" /><span>Please read and tick each box below before we submit the testimonial.</span></p>

                        <fieldset className="terms-list">
                            <legend className="sr-only">Terms and consent</legend>
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
                        </fieldset>

                        <div className="step-nav">
                            <button className="btn-ghost" onClick={() => setStep(5)}><ArrowLeft size={15} /> Back</button>
                            <button
                                className="btn-primary"
                                disabled={!allTermsAccepted}
                                onClick={() => setStep(7)}
                            >
                                Next <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 7: REVIEW */}
                {step === 7 && (
                    <div className="step">
                        <h2>Does everything look right?</h2>
                        <p className="step-desc"><Info size={16} className="step-desc-icon" /><span>Take a quick look before we send it. You can go back and change anything.</span></p>
                        <div className="submit-review">
                            <h3>{form.title}</h3>
                            <dl>
                                <dt>Shared by</dt>
                                <dd>{form.anonymous ? 'Anonymous' : form.person_name}</dd>
                                <dt>Conditions</dt>
                                <dd className="submit-review-tags">{form.conditions.map(c => <span key={c} className="tag tag-condition">{c}</span>)}</dd>
                                <dt>Products</dt>
                                <dd className="submit-review-tags">{form.products.map(p => <span key={p} className="tag tag-product">{p}</span>)}</dd>
                                {galleryImages.length > 0 && <><dt>Photos</dt><dd>{galleryImages.length} added</dd></>}
                            </dl>
                            <h4>Your testimonial</h4>
                            <p className="submit-review-story">{form.story_text}</p>
                        </div>
                        {uploadProgress && <p className="upload-progress">{uploadProgress}</p>}
                        <div className="step-nav">
                            <button className="btn-ghost" onClick={() => setStep(6)}><ArrowLeft size={15} /> Back</button>
                            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Submitting...' : <><Check size={15} /> Submit Testimonial</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
