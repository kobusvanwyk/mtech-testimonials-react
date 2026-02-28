import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Single() {
    const { id } = useParams()
    const [testimonial, setTestimonial] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetch() {
            const { data } = await supabase
                .from('testimonials')
                .select('*')
                .eq('id', id)
                .single()
            setTestimonial(data)
            setLoading(false)
        }
        fetch()
    }, [id])

    if (loading) return <div className="loading">Loading...</div>
    if (!testimonial) return <div className="not-found">Story not found.</div>

    const t = testimonial

    return (
        <div className="single-page">
            <Link to="/" className="back-link">← Back to all stories</Link>
            <article className="single-article">
                {t.featured_image_url && (
                    <img src={t.featured_image_url} alt={t.title} className="single-image" />
                )}
                <h1 className="single-title">{t.title}</h1>
                <p className="single-meta">
                    By <strong>{t.anonymous ? 'Anonymous' : t.person_name}</strong>
                    {' · '}
                    {new Date(t.created_at).toLocaleDateString('en-ZA', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    })}
                </p>
                <div className="single-tags">
                    {t.conditions?.map(c => <span key={c} className="tag tag-condition">{c}</span>)}
                    {t.products?.map(p => <span key={p} className="tag tag-product">{p}</span>)}
                </div>
                <div className="single-body">
                    {t.story_text?.split('\n').map((para, i) => (
                        <p key={i}>{para}</p>
                    ))}
                </div>
                {t.gallery_urls?.length > 0 && (
                    <div className="single-gallery">
                        {t.gallery_urls.map((url, i) => (
                            <img key={i} src={url} alt={`Gallery ${i + 1}`} className="gallery-image" />
                        ))}
                    </div>
                )}
            </article>
        </div>
    )
}