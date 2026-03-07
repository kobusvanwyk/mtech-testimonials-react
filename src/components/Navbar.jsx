import { Link } from 'react-router-dom'

export default function Navbar() {
    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                <img
                    src="/mtech-testimonials-logo.svg"
                    alt="MTech Testimonials"
                    className="navbar-logo"
                />
            </Link>
            <div className="navbar-links">
                <Link to="/">View Stories</Link>
                <Link to="/submit" className="btn-submit-nav">Share Your Story</Link>
            </div>
        </nav>
    )
}
