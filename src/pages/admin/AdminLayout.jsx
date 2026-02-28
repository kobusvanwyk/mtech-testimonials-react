import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const ADMIN_PASSWORD = 'mannatech2024'

export default function AdminLayout() {
    const [authed, setAuthed] = useState(
        sessionStorage.getItem('adminAuthed') === 'true'
    )
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)
    const navigate = useNavigate()

    function handleLogin() {
        if (password === ADMIN_PASSWORD) {
            sessionStorage.setItem('adminAuthed', 'true')
            setAuthed(true)
            navigate('/admin/dashboard')
        } else {
            setError(true)
        }
    }

    function handleLogout() {
        sessionStorage.removeItem('adminAuthed')
        setAuthed(false)
        setPassword('')
    }

    if (!authed) {
        return (
            <div className="admin-login">
                <div className="admin-login-box">
                    <div className="admin-login-logo">🔒</div>
                    <h2>Admin Access</h2>
                    <p className="admin-login-sub">Mannatech Testimonials</p>
                    <input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(false) }}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        className={error ? 'input-error' : ''}
                    />
                    {error && <p className="error-msg">Incorrect password</p>}
                    <button className="btn-login" onClick={handleLogin}>Login</button>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <span className="admin-sidebar-title">Admin Panel</span>
                </div>
                <nav className="admin-nav">
                    <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}>
                        📊 Dashboard
                    </NavLink>
                    <NavLink to="/admin/pending" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}>
                        ⏳ Pending
                    </NavLink>
                    <NavLink to="/admin/published" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}>
                        ✅ Published
                    </NavLink>
                    <NavLink to="/admin/all" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}>
                        📋 All Testimonials
                    </NavLink>
                    <div className="admin-nav-divider" />
                    <NavLink to="/admin/categories" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}>
                        🏷️ Categories
                    </NavLink>
                </nav>
                <div className="admin-sidebar-footer">
                    <a href="/" className="admin-nav-item" target="_blank">🌐 View Site</a>
                    <button className="admin-logout" onClick={handleLogout}>🚪 Logout</button>
                </div>
            </aside>
            <div className="admin-main">
                <Outlet />
            </div>
        </div>
    )
}
