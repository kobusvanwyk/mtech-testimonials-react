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
    if (!testimonial) return <div className="not-found">Testimonial not found.</div>

    const t = testimonial

    return (
        <div className={`single-page ${shareMode ? 'share-mode' : ''}`}>
            {!shareMode && (
                <div className="single-top-bar">
                    <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to all testimonials</Link>
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
                    <a
                        className="btn-whatsapp"
                        href={`https://wa.me/?text=${encodeURIComponent(`Check out this Mannatech testimonial: "${t.title}"\n${window.location.origin}/testimonial/${slug}`)}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Share on WhatsApp
                    </a>
                    <button className={`btn-share ${copied ? 'copied' : ''}`} onClick={handleShare}>
                        {copied
                            ? <><Check size={15} /> Link copied!</>
                            : <><Share2 size={15} /> Copy link</>
                        }
                    </button>
                    {copied && (
                        <p className="share-hint">
                            Share this link — it opens the testimonial without the site header and footer.
                        </p>
                    )}
                </div>
            </article>
        </div>
    )
}
