import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Single from './pages/Single'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Pending from './pages/admin/Pending'
import Published from './pages/admin/Published'
import AllTestimonials from './pages/admin/AllTestimonials'
import EditTestimonial from './pages/admin/EditTestimonial'
import Categories from './pages/admin/Categories'
import './index.css'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<><Navbar /><main className="main-content"><Home /></main></>} />
                <Route path="/submit" element={<><Navbar /><main className="main-content"><Submit /></main></>} />
                <Route path="/testimonial/:id" element={<><Navbar /><main className="main-content"><Single /></main></>} />
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="pending" element={<Pending />} />
                    <Route path="published" element={<Published />} />
                    <Route path="all" element={<AllTestimonials />} />
                    <Route path="edit/:id" element={<EditTestimonial />} />
                    <Route path="categories" element={<Categories />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
