import { Link } from 'react-router-dom'

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-main">
                <div className="footer-brand">
                    <Link to="/">
                        <img
                            src="/mtech-testimonials-logo.svg"
                            alt="MTech Testimonials"
                            className="footer-logo-img"
                        />
                    </Link>
                </div>

                <div className="footer-links">
                    <Link to="/terms" className="footer-link">Terms &amp; Conditions</Link>
                    <Link to="/privacy" className="footer-link">Privacy Policy</Link>
                </div>

                <div className="footer-disclaimer">
                    <p>
                        Mannatech products are nutritional supplements and are not
                        intended to diagnose, treat, cure, or prevent any disease. By
                        law, no guarantee can be given that these products will cure
                        any medical condition.
                    </p>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© 2026 MTech Testimonials. All Rights Reserved.</p>
            </div>
        </footer>
    )
}
