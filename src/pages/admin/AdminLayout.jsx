import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ADMIN_PASSWORD = 'mannatech2024'

export default function AdminLayout() {
    const [authed, setAuthed] = useState(
        sessionStorage.getItem('adminAuthed') === 'true'
    )
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)
    const [quickSearch, setQuickSearch] = useState('')
    const [quickResults, setQuickResults] = useState([])
    const [searching, setSearching] = useState(false)
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

    async function handleQuickSearch(q) {
        setQuickSearch(q)
        if (!q.trim()) { setQuickResults([]); return }
        setSearching(true)
        const { data } = await supabase
            .from('testimonials')
            .select('id, title, status')
            .or(`title.ilike.%${q}%,person_name.ilike.%${q}%`)
            .limit(6)
        setQuickResults(data || [])
        setSearching(false)
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
                <div className="admin-search-wrap">
                    <input
                        type="text"
                        placeholder="Quick find..."
                        value={quickSearch}
                        onChange={e => handleQuickSearch(e.target.value)}
                        className="admin-quick-search"
                    />
                    {quickResults.length > 0 && (
                        <div className="admin-search-results">
                            {quickResults.map(r => (
                                <NavLink
                                    key={r.id}
                                    to={`/admin/edit/${r.id}`}
                                    className="admin-search-result"
                                    onClick={() => { setQuickSearch(''); setQuickResults([]) }}
                                >
                                    <span className="qs-title">{r.title}</span>
                                    <span className={`qs-status status-badge badge-${r.status === 'approved' ? 'approved' : r.status === 'pending' ? 'pending' : 'unpublished'}`}>{r.status}</span>
                                </NavLink>
                            ))}
                        </div>
                    )}
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
                    <NavLink to="/admin/legal" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}>
                        📄 Legal Pages
                    </NavLink>
                    <NavLink to="/admin/images" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}>
                        🖼️ Image Manager
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
