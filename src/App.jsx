import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Single from './pages/Single'
import Admin from './pages/Admin'
import './index.css'

function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/submit" element={<Submit />} />
                    <Route path="/testimonial/:id" element={<Single />} />
                    <Route path="/admin" element={<Admin />} />
                </Routes>
            </main>
        </BrowserRouter>
    )
}

export default App