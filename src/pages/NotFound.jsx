import { Link } from 'react-router-dom'

export default function NotFound() {
    return (
        <div className="not-found">
            <div className="not-found-inner">
                <div className="not-found-code">
                    <span className="nf-four">4</span>
                    <span className="nf-zero">0</span>
                    <span className="nf-four">4</span>
                </div>
                <h1 className="not-found-title">Page not found</h1>
                <p className="not-found-sub">
                    The page you're looking for doesn't exist, or may have been moved.
                </p>
                <div className="not-found-actions">
                    <Link to="/" className="btn-primary">Browse testimonials</Link>
                    <Link to="/submit" className="btn-secondary">Share your testimonial</Link>
                </div>
            </div>
        </div>
    )
}
