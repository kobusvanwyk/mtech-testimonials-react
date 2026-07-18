import { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
    LayoutDashboard, List, Tag,
    Images, Globe, LogOut, Lock, Upload, Settings, FileText, Eye, EyeOff, ScanSearch
} from 'lucide-react'

export default function AdminLayout() {
    const [session, setSession] = useState(undefined) // undefined = loading
    const [email, setEmail]     = useState('')
    const [password, setPassword] = useState('')
    const [error, setError]     = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
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
                    <div className="password-field">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className={error ? 'input-error' : ''}
                            required
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(v => !v)}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
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
        { to: '/admin/all',        label: 'All Testimonials',icon: <List size={16} /> },
        null,
        { to: '/admin/categories', label: 'Categories',      icon: <Tag size={16} /> },
        { to: '/admin/images',     label: 'Image Manager',   icon: <Images size={16} /> },
        null,
        { to: '/admin/import',      label: 'Import CSV',       icon: <Upload size={16} /> },
        { to: '/admin/whatsapp',    label: 'WhatsApp Sync',    icon: <span className="nav-wa-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></span> },
        { to: '/admin/duplicates',  label: 'Duplicate Scanner',icon: <ScanSearch size={16} /> },
        null,
        { to: '/admin/settings',    label: 'Settings',         icon: <Settings size={16} /> },
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
