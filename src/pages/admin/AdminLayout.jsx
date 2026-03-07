import { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
    LayoutDashboard, Clock, CheckCircle, List, Tag,
    Images, Globe, LogOut, Lock, Upload, Settings, FileText
} from 'lucide-react'

export default function AdminLayout() {
    const [session, setSession] = useState(undefined) // undefined = loading
    const [email, setEmail]     = useState('')
    const [password, setPassword] = useState('')
    const [error, setError]     = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })
        // Listen for auth changes (login / logout / token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
        return () => subscription.unsubscribe()
    }, [])

    async function handleLogin(e) {
        e.preventDefault()
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        setLoading(false)
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate('/admin')
    }

    // Still checking session
    if (session === undefined) return (
        <div className="admin-login">
            <div className="admin-login-box">
                <div className="admin-login-logo"><Lock size={40} /></div>
                <p className="admin-login-sub">Loading…</p>
            </div>
        </div>
    )

    if (!session) return (
        <div className="admin-login">
            <div className="admin-login-box">
                <div className="admin-login-logo"><Lock size={40} /></div>
                <h2>Admin Login</h2>
                <p className="admin-login-sub">Sign in to continue</p>
                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className={error ? 'input-error' : ''}
                        autoFocus
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={error ? 'input-error' : ''}
                        required
                    />
                    {error && <p className="error-msg">{error}</p>}
                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
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
        { to: '/admin/images',     label: 'Image Manager',   icon: <Images size={16} /> },
        null,
        { to: '/admin/import',     label: 'Import CSV',      icon: <Upload size={16} /> },
        null,
        { to: '/admin/settings',      label: 'Settings',        icon: <Settings size={16} /> },
        { to: '/admin/pdf-settings',  label: 'PDF Settings',    icon: <FileText size={16} /> },
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
                    <div className="admin-user-email">{session.user.email}</div>
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
