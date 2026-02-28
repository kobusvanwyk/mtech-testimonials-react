import { Link } from 'react-router-dom'

export default function Navbar() {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <img src="/mannatech-logo.png" alt="Mannatech" className="logo" />
                <span>Testimonials</span>
            </div>
            <div className="navbar-links">
                <Link to="/">View Stories</Link>
                <Link to="/submit" className="btn-submit-nav">Share Your Story</Link>
            </div>
        </nav>
    )
}