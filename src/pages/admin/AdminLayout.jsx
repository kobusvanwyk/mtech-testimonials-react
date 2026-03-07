import { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
    LayoutDashboard, Clock, CheckCircle, List, Tag,
    FileText, Images, Globe, LogOut, Lock
} from 'lucide-react'

export default function AdminLayout() {
    const [authed, setAuthed]   = useState(false)
    const [password, setPassword] = useState('')
    const [error, setError]     = useState('')
    const navigate  = useNavigate()
    const location  = useLocation()
    const ADMIN_PWD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'

    useEffect(() => {
        setAuthed(sessionStorage.getItem('admin_authed') === 'true')
    }, [])

    function handleLogin(e) {
        e.preventDefault()
        if (password === ADMIN_PWD) {
            sessionStorage.setItem('admin_authed', 'true')
            setAuthed(true)
            setError('')
        } else {
            setError('Incorrect password.')
        }
    }

    function handleLogout() {
        sessionStorage.removeItem('admin_authed')
        setAuthed(false)
        navigate('/admin')
    }

    if (!authed) return (
        <div className="admin-login">
            <div className="admin-login-box">
                <div className="admin-login-logo"><Lock size={40} /></div>
                <h2>Admin Login</h2>
                <p className="admin-login-sub">Enter your password to continue</p>
                <form onSubmit={handleLogin}>
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={error ? 'input-error' : ''}
                        autoFocus
                    />
                    {error && <p className="error-msg">{error}</p>}
                    <button type="submit" className="btn-login">Sign In</button>
                </form>
            </div>
        </div>
    )

    const nav = [
        { to: '/admin',            label: 'Dashboard',       icon: <LayoutDashboard size={16} /> },
        { to: '/admin/pending',    label: 'Pending',         icon: <Clock size={16} /> },
        { to: '/admin/published',  label: 'Published',       icon: <CheckCircle size={16} /> },
        { to: '/admin/all',        label: 'All Testimonials',icon: <List size={16} /> },
        null,
        { to: '/admin/categories', label: 'Categories',      icon: <Tag size={16} /> },
        { to: '/admin/legal',      label: 'Legal Pages',     icon: <FileText size={16} /> },
        { to: '/admin/images',     label: 'Image Manager',   icon: <Images size={16} /> },
    ]

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <span className="admin-sidebar-title">MTech Admin</span>
                </div>
                <nav className="admin-nav">
                    {nav.map((item, i) =>
                        item === null
                            ? <div key={i} className="admin-nav-divider" />
                            : <Link
                                key={item.to}
                                to={item.to}
                                className={`admin-nav-item ${location.pathname === item.to ? 'active' : ''}`}
                              >
                                {item.icon} {item.label}
                              </Link>
                    )}
                </nav>
                <div className="admin-sidebar-footer">
                    <a href="/" className="admin-nav-item" target="_blank">
                        <Globe size={16} /> View Site
                    </a>
                    <button className="admin-logout" onClick={handleLogout}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </aside>
            <main className="admin-main">
                <Outlet />
            </main>
        </div>
    )
}
