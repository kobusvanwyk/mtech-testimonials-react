import { Link } from 'react-router-dom'

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-main">
                <div className="footer-brand">
                    <div className="footer-logo">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 36V14l16 11L40 14v22" stroke="url(#footer-grad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            <defs>
                                <linearGradient id="footer-grad" x1="8" y1="14" x2="40" y2="36" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#00c97a"/>
                                    <stop offset="100%" stopColor="#0097a7"/>
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="footer-logo-text">
                            <span className="footer-logo-brand">MANNATECH</span>
                            <span className="footer-logo-badge">TESTIMONIALS DATABASE</span>
                        </div>
                    </div>
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
