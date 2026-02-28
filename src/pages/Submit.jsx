import { useState } from 'react'
import { supabase } from '../lib/supabase'

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

    async function handleSubmit() {
        setLoading(true)
        const { error } = await supabase.from('testimonials').insert([{
            title: form.title,
            person_name: form.anonymous ? null : form.person_name,
            anonymous: form.anonymous,
            conditions: form.conditions,
            products: form.products,
            story_text: form.story_text,
            status: 'pending'
        }])

        setLoading(false)
        if (!error) setSubmitted(true)
        else alert('Something went wrong. Please try again.')
    }

    if (submitted) {
        return (
            <div className="submit-success">
                <div className="success-icon">🎉</div>
                <h2>Thank you for sharing your story!</h2>
                <p>Your testimonial has been submitted and will be reviewed before publishing.</p>
            </div>
        )
    }

    return (
        <div className="submit-page">
            <div className="submit-container">
                <div className="step-progress">
                    {[1, 2, 3, 4, 5].map(n => (
                        <div key={n} className={`step-dot ${step >= n ? 'active' : ''}`} />
                    ))}
                </div>
                <p className="step-counter">Step {step} of 5</p>

                {/* STEP 1: Title & Name */}
                {step === 1 && (
                    <div className="step">
                        <h2>Tell us about your experience</h2>
                        <p className="step-desc">Give your story a short, descriptive title.</p>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="e.g. Ambrotose helped my arthritis"
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
                        </div>
                        {!form.anonymous && (
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Your name (e.g. Maria van der Berg)"
                                value={form.person_name}
                                onChange={e => updateForm('person_name', e.target.value)}
                            />
                        )}
                        <button
                            className="btn-next"
                            disabled={!form.title || (!form.anonymous && !form.person_name)}
                            onClick={() => setStep(2)}
                        >
                            Next →
                        </button>
                    </div>
                )}

                {/* STEP 2: Health Conditions */}
                {step === 2 && (
                    <div className="step">
                        <h2>Which health condition(s) does this relate to?</h2>
                        <p className="step-desc">Type a condition and press Enter or comma to add it.</p>
                        <div className="tag-input-area">
                            {form.conditions.map(c => (
                                <span key={c} className="tag-pill">
                  {c} <button onClick={() => removeCondition(c)}>✕</button>
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
                            <button className="btn-back" onClick={() => setStep(1)}>← Back</button>
                            <button
                                className="btn-next"
                                disabled={form.conditions.length === 0}
                                onClick={() => setStep(3)}
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Products */}
                {step === 3 && (
                    <div className="step">
                        <h2>Which Mannatech product(s) are you sharing about?</h2>
                        <p className="step-desc">Select all that apply.</p>
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
                            <button className="btn-back" onClick={() => setStep(2)}>← Back</button>
                            <button
                                className="btn-next"
                                disabled={form.products.length === 0}
                                onClick={() => setStep(4)}
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Story */}
                {step === 4 && (
                    <div className="step">
                        <h2>Tell your story</h2>
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
                            <button className="btn-back" onClick={() => setStep(3)}>← Back</button>
                            <button
                                className="btn-next"
                                disabled={form.story_text.length < 50}
                                onClick={() => setStep(5)}
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5: Review & Submit */}
                {step === 5 && (
                    <div className="step">
                        <h2>Review your story</h2>
                        <div className="review-card">
                            <h3>{form.title}</h3>
                            <p><strong>By:</strong> {form.anonymous ? 'Anonymous' : form.person_name}</p>
                            <p><strong>Conditions:</strong> {form.conditions.join(', ')}</p>
                            <p><strong>Products:</strong> {form.products.join(', ')}</p>
                            <p><strong>Story:</strong></p>
                            <p className="review-story">{form.story_text}</p>
                        </div>
                        <div className="step-nav">
                            <button className="btn-back" onClick={() => setStep(4)}>← Back</button>
                            <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Submitting...' : '✓ Submit My Story'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}