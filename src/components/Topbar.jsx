import { Link } from 'react-router-dom'

export default function Topbar() {
    return (
        <div className="navbar-topbar">
            <span>Do you have a Mannatech testimonial to share?</span>
            <Link to="/submit" className="navbar-topbar-btn">Submit Your Testimonial</Link>
        </div>
    )
}
