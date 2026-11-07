import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Avatar from './Avatar'
import { storyExcerpt } from '../lib/storyText'
import { displayName, hidesAuthor } from '../lib/displayName'
import { useSiteSettings } from '../lib/SiteSettingsContext'

export default function TestimonialCard({ testimonial: t }) {
    const { nameDisplay, showDates } = useSiteSettings()
    const name = displayName(t, nameDisplay)
    const noAuthor = hidesAuthor(nameDisplay)
    const dateShown = showDates && t.created_at
    return (
        <div className="testimonial-card">
            <Link to={`/testimonial/${t.slug || t.id}`} className="card-read-more-cover" />
            <div className="card-body">
                <h3 className="card-title">
                    <Link to={`/testimonial/${t.slug || t.id}`}>{t.title}</Link>
                </h3>
                {(!noAuthor || dateShown) && <div className="card-author">
                    {!noAuthor && <>
                        <Avatar name={name} anonymous={!name} size="sm" />
                        <span className="card-author-name">
                            {name || 'Anonymous'}
                        </span>
                    </>}
                    {dateShown && (
                        <span className="card-date">
                            {new Date(t.created_at).toLocaleDateString('en-ZA', {
                                year: 'numeric', month: 'short', day: 'numeric'
                            })}
                        </span>
                    )}
                </div>}
                <p className="card-excerpt">{storyExcerpt(t.story_text, 150)}</p>
                <div className="card-tags">
                    {t.conditions?.map(c => (
                        <span key={c} className="tag tag-outline tag-condition">{c}</span>
                    ))}
                    {t.products?.map(p => (
                        <span key={p} className="tag tag-outline tag-product">{p}</span>
                    ))}
                </div>
            </div>
            <div className="card-actions">
                <Link to={`/testimonial/${t.slug || t.id}`} className="card-action-btn">
                    Read full testimonial <ArrowRight size={16} aria-hidden="true" />
                </Link>
            </div>
        </div>
    )
}
