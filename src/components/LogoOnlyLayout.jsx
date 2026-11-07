import Footer from './Footer'
import SkipLink from './SkipLink'

export default function LogoOnlyLayout({ children }) {
    return (
        <>
            <SkipLink />
            <header className="logo-only-header">
                <img
                    src="/mtech-testimonials-logo.svg"
                    alt="Mtech Testimonials"
                    className="logo-only-img"
                />
            </header>
            <main id="main-content" tabIndex={-1} className="main-content">{children}</main>
            <Footer disableLogoLink />
        </>
    )
}
