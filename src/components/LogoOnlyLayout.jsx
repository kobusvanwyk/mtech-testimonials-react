import Footer from './Footer'

export default function LogoOnlyLayout({ children }) {
    return (
        <>
            <header className="logo-only-header">
                <img
                    src="/mtech-testimonials-logo.svg"
                    alt="MTech Testimonials"
                    className="logo-only-img"
                />
            </header>
            <main className="main-content">{children}</main>
            <Footer disableLogoLink />
        </>
    )
}
