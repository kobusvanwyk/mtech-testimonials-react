import { Link, useLocation } from 'react-router-dom'

// Announcement bar. Phones get a single short line with an inline link.
// Hidden on the Submit page, where it would only point at itself.
export default function Topbar() {
    const { pathname } = useLocation()
    if (pathname.startsWith('/submit')) return null
    return (
        <div className="navbar-topbar" role="region" aria-label="Announcement">
            <span className="navbar-topbar-long">Do you have a Mannatech testimonial to share?</span>
            <span className="navbar-topbar-short">Got a testimonial?</span>
            <Link to="/submit" className="navbar-topbar-btn">
                <span className="navbar-topbar-long">Submit your testimonial</span>
                <span className="navbar-topbar-short">Submit it here</span>
            </Link>
        </div>
    )
}
