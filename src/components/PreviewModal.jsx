import { useEffect } from 'react'
import { Check, X } from 'lucide-react'

export default function PreviewModal({ testimonial, onClose, onPublish }) {
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    if (!testimonial) return null

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <div className="modal-header">
                    <h3>Preview</h3>
                    <div className="modal-header-actions">
                        {onPublish && (
                            <button className="btn-publish-modal" onClick={onPublish}>
                                <Check size={14} /> Publish Now
                            </button>
                        )}
                        <button className="modal-close" onClick={onClose}><X size={16} /></button>
                    </div>
                </div>
                <div className="modal-body">
                    <h2 className="modal-title">{testimonial.title}</h2>
                    <p className="modal-author">
                        {testimonial.anonymous ? 'Anonymous' : testimonial.person_name}
                        {' · '}
                        {new Date(testimonial.created_at).toLocaleDateString('en-ZA', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        })}
                    </p>

                    <div className="modal-tags">
                        {(testimonial.conditions || []).map(c => (
                            <span key={c} className="tag tag-condition">{c}</span>
                        ))}
                        {(testimonial.products || []).map(p => (
                            <span key={p} className="tag tag-product">{p}</span>
                        ))}
                    </div>

                    <div className="modal-story">{testimonial.story_text}</div>

                    {(testimonial.gallery_urls || []).length > 0 && (
                        <div className="modal-gallery">
                            {testimonial.gallery_urls.map((url, i) => (
                                <img key={i} src={url} alt={`Gallery ${i + 1}`} className="modal-gallery-img" />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
