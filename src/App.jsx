import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Single from './pages/Single'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import SearchResults from './pages/SearchResults'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Pending from './pages/admin/Pending'
import AllTestimonials from './pages/admin/AllTestimonials'
import EditTestimonial from './pages/admin/EditTestimonial'
import Categories from './pages/admin/Categories'
import ImageManager from './pages/admin/ImageManager'
import ImportTestimonials from './pages/admin/ImportTestimonials'
import Settings from './pages/admin/Settings'
import PDFSettings from './pages/admin/PDFSettings'

function PublicLayout({ children }) {
    return (
        <>
            <header className="site-header">
                <Navbar />
            </header>
            <main className="main-content">{children}</main>
            <Footer />
        </>
    )
}

// Renders Single with or without layout depending on ?share=1
function SingleRoute() {
    const [searchParams] = useSearchParams()
    const isShare = searchParams.get('share') === '1'
    return isShare
        ? <Single shareMode />
        : <PublicLayout><Single /></PublicLayout>
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
                <Route path="/submit" element={<PublicLayout><Submit /></PublicLayout>} />
                <Route path="/testimonial/:slug" element={<SingleRoute />} />
                <Route path="/terms" element={<PublicLayout><Terms /></PublicLayout>} />
                <Route path="/privacy" element={<PublicLayout><Privacy /></PublicLayout>} />
                <Route path="/search" element={<PublicLayout><SearchResults /></PublicLayout>} />

                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="pending" element={<Pending />} />
                    <Route path="all" element={<AllTestimonials />} />
                    <Route path="edit/:id" element={<EditTestimonial />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="images" element={<ImageManager />} />
                    <Route path="import" element={<ImportTestimonials />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="pdf-settings" element={<PDFSettings />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
