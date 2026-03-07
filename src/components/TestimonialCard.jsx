import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function TestimonialCard({ testimonial: t }) {
    return (
        <div className="testimonial-card">
            <Link to={`/testimonial/${t.slug || t.id}`} className="card-read-more-cover" />
            {t.featured_image_url && (
                <img src={t.featured_image_url} alt={t.title} className="card-image" />
            )}
            <div className="card-body">
                <h3 className="card-title">
                    <Link to={`/testimonial/${t.slug || t.id}`}>{t.title}</Link>
                </h3>
                <p className="card-author">
                    {t.anonymous ? 'Anonymous' : t.person_name}
                </p>
                <p className="card-excerpt">
                    {t.story_text?.substring(0, 150)}...
                </p>
                <div className="card-tags">
                    {t.conditions?.map(c => (
                        <span key={c} className="tag tag-condition">{c}</span>
                    ))}
                    {t.products?.map(p => (
                        <span key={p} className="tag tag-product">{p}</span>
                    ))}
                </div>
                <Link to={`/testimonial/${t.slug || t.id}`} className="card-read-more">
                    Read full story <ArrowRight size={14} />
                </Link>
            </div>
        </div>
    )
}
