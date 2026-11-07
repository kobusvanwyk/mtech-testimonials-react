import { Link } from 'react-router-dom'

// Public footer (ui-guide #shell-public): navy, teal-to-lime band, white logo
// and tagline, Explore and Legal links, the supplements disclaimer, copyright.
// disableLogoLink = private-mode layout: only Submit and the legal pages are
// reachable, so the browse links are left out.
export default function Footer({ disableLogoLink = false }) {
    const logo = <img src="/mtech-testimonials-logo-white.svg" alt="Mtech Testimonials" className="footer-logo-img" />
    const year = new Date().getFullYear()

    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-band" aria-hidden="true" />
                <div className="footer-cols">
                    <div className="footer-brand">
                        {disableLogoLink ? logo : <Link to="/" className="footer-logo-link">{logo}</Link>}
                        <p>Real testimonials from Mannatech South Africa associates, reviewed before they are published.</p>
                    </div>

                    <nav className="footer-nav" aria-label="Footer">
                        <div className="footer-label">Explore</div>
                        {!disableLogoLink && <Link to="/" className="footer-link">Browse all testimonials</Link>}
                        <Link to="/submit" className="footer-link">Submit your testimonial</Link>
                        {!disableLogoLink && <a href="/how-to.html" className="footer-link">How to use this site</a>}
                        <div className="footer-label footer-label--gap">Legal</div>
                        <Link to="/terms" className="footer-link">Terms &amp; Conditions</Link>
                        <Link to="/privacy" className="footer-link">Privacy Policy</Link>
                    </nav>

                    <div className="footer-disclaimer">
                        <div className="footer-label">Disclaimer</div>
                        <p>
                            Mannatech products are nutritional supplements and are not
                            intended to diagnose, treat, cure, or prevent any disease. By
                            law, no guarantee can be given that these products will cure
                            any medical condition.
                        </p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <span>© {year} Mtech Testimonials. All rights reserved.</span>
                    <span>mtechtestimonials.co.za</span>
                </div>
            </div>
        </footer>
    )
}
