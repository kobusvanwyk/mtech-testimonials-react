import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Share2, Check, Pencil } from 'lucide-react'
import { PDFDownloadButton } from '../components/PDFDownloadButton'
import { Gallery, Item } from 'react-photoswipe-gallery'
import 'photoswipe/dist/photoswipe.css'

export default function Single({ shareMode = false }) {
    const { slug } = useParams()
    const [testimonial, setTestimonial] = useState(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [imageDimensions, setImageDimensions] = useState({})

    useEffect(() => {
        async function fetchTestimonial() {
            // If it looks like a UUID or numeric ID, look up by id — otherwise by slug
            const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
                      || /^\d+$/.test(slug)
            const query = supabase.from('testimonials').select('*')
            const { data } = await (isId
                ? query.eq('id', slug).single()
                : query.eq('slug', slug).single())
            setTestimonial(data)
            setLoading(false)
            // Pre-load image dimensions for PhotoSwipe
            if (data?.gallery_urls?.length) {
                const dims = {}
                await Promise.all(data.gallery_urls.map(url => new Promise(resolve => {
                    const img = new Image()
                    img.onload = () => { dims[url] = { w: img.naturalWidth, h: img.naturalHeight }; resolve() }
                    img.onerror = () => { dims[url] = { w: 1200, h: 800 }; resolve() }
                    img.src = url
                })))
                setImageDimensions(dims)
            }
        }
        async function checkSession() {
            const { data: { session } } = await supabase.auth.getSession()
            setIsAdmin(!!session)
        }
        fetchTestimonial()
        checkSession()
    }, [slug])

    function handleShare() {
        const shareUrl = `${window.location.origin}/testimonial/${slug}?share=1`
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        })
    }

    if (loading) return <div className="loading">Loading...</div>
    if (!testimonial) return <div className="not-found">Story not found.</div>

    const t = testimonial

    return (
        <div className={`single-page ${shareMode ? 'share-mode' : ''}`}>
            {!shareMode && (
                <div className="single-top-bar">
                    <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to all stories</Link>
                    <div className="single-top-bar-actions">
                        <PDFDownloadButton testimonial={t} />
                        {isAdmin && (
                            <Link to={`/admin/edit/${t.id}`} className="btn-edit-admin">
                                <Pencil size={14} /> Edit
                            </Link>
                        )}
                    </div>
                </div>
            )}

            <article className="single-article">
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
                        <Gallery withDownloadButton>
                            {t.gallery_urls.map((url, i) => {
                                const dim = imageDimensions[url] || { w: 1200, h: 800 }
                                return (
                                    <Item key={i} original={url} thumbnail={url} width={dim.w} height={dim.h} alt={`Photo ${i + 1}`}>
                                        {({ ref, open }) => (
                                            <img
                                                ref={ref}
                                                src={url}
                                                onClick={open}
                                                alt={`Photo ${i + 1}`}
                                                className="gallery-image gallery-image-clickable"
                                            />
                                        )}
                                    </Item>
                                )
                            })}
                        </Gallery>
                    </div>
                )}

                <div className="single-share">
                    <button className={`btn-share ${copied ? 'copied' : ''}`} onClick={handleShare}>
                        {copied
                            ? <><Check size={15} /> Link copied!</>
                            : <><Share2 size={15} /> Share this story</>
                        }
                    </button>
                    {copied && (
                        <p className="share-hint">
                            Share this link — it opens the story without the site header and footer.
                        </p>
                    )}
                </div>
            </article>
        </div>
    )
}
