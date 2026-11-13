import { useState, useEffect, useRef, useCallback } from 'react'
import Alert from '../../components/Alert'
import { Link, Outlet, Navigate, useNavigate, useLocation, matchPath } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSiteSettings } from '../../lib/SiteSettingsContext'
import Avatar from '../../components/Avatar'
import ChangePasswordDialog from '../../components/ChangePasswordDialog'
import { fetchRole, finderMayOpen, FINDER_HOME, isViewingAsFinder, setViewingAsFinder } from '../../lib/roles'
import {
    LayoutDashboard, List, Clock, Sparkles, Tag, Images, Upload, MessageCircle,
    ScanSearch, Settings, FileText, Menu, X, Lock, ExternalLink, BookOpen, LogOut,
    ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, KeyRound, UserRoundSearch, FilePlus,
} from 'lucide-react'

// App shell (design/DESIGN.md "App shell", ui-guide #shell to #shell-login).
// Four labelled groups; an item is active on its own route or any child route.
const NAV_GROUPS = [
    { label: 'Testimonials', items: [
        { to: '/admin/dashboard', label: 'Dashboard',        Icon: LayoutDashboard },
        { to: '/admin/all',       label: 'All Testimonials', Icon: List, also: ['/admin/edit/:id'] },
        { to: '/admin/new',       label: 'Add Testimonial',  Icon: FilePlus },
        { to: '/admin/pending',   label: 'Pending Review',   Icon: Clock, count: true },
        { to: '/admin/ask',       label: 'Ask AI',           Icon: Sparkles, finder: true },
    ]},
    { label: 'Library', items: [
        { to: '/admin/categories', label: 'Categories',    Icon: Tag },
        { to: '/admin/images',     label: 'Image Manager', Icon: Images },
    ]},
    { label: 'Import', items: [
        { to: '/admin/import',     label: 'Import CSV',        Icon: Upload },
        { to: '/admin/whatsapp',   label: 'WhatsApp Sync',     Icon: MessageCircle },
        { to: '/admin/duplicates', label: 'Duplicate Scanner', Icon: ScanSearch },
    ]},
    { label: 'Settings', items: [
        { to: '/admin/settings',     label: 'Settings',     Icon: Settings },
        { to: '/admin/pdf-settings', label: 'PDF Settings', Icon: FileText },
    ]},
]
const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

// Finders see only the items marked finder: true (Ask AI)
function navFor(role) {
    if (role === 'admin') return NAV_GROUPS
    return NAV_GROUPS
        .map(g => ({ ...g, items: g.items.filter(i => i.finder) }))
        .filter(g => g.items.length)
}

function isActive(item, pathname) {
    if (pathname === item.to || pathname.startsWith(item.to + '/')) return true
    return (item.also || []).some(p => matchPath(p, pathname))
}

// Breadcrumb trail for the top bar: [{ label, to? }]
function crumbsFor(pathname) {
    if (matchPath('/admin/new', pathname)) {
        return [{ label: 'All Testimonials', to: '/admin/all' }, { label: 'Add Testimonial' }]
    }
    if (matchPath('/admin/edit/:id', pathname)) {
        return [{ label: 'All Testimonials', to: '/admin/all' }, { label: 'Edit Testimonial' }]
    }
    const item = NAV_ITEMS.find(i => isActive(i, pathname))
    return [{ label: item ? item.label : 'Admin' }]
}

function useMediaQuery(query) {
    const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches
    const [matches, setMatches] = useState(get)
    useEffect(() => {
        const mql = window.matchMedia(query)
        const onChange = () => setMatches(mql.matches)
        onChange()
        mql.addEventListener('change', onChange)
        return () => mql.removeEventListener('change', onChange)
    }, [query])
    return matches
}

function focusablesIn(el) {
    return el ? [...el.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')] : []
}

function displayName(user) {
    const meta = user?.user_metadata || {}
    if (meta.full_name || meta.name) return meta.full_name || meta.name
    const local = (user?.email || '').split('@')[0]
    return local.split(/[._\-\d]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') || 'Admin'
}

// ── Account menu (top bar) ───────────────────────────────────────────────────
function AccountMenu({ user, role, realRole, previewing, onPreview, onLogout }) {
    const [open, setOpen] = useState(false)
    const [pwOpen, setPwOpen] = useState(false)
    const btnRef  = useRef(null)
    const menuRef = useRef(null)
    const name = displayName(user)

    const close = useCallback((returnFocus) => {
        setOpen(false)
        if (returnFocus) btnRef.current?.focus({ preventScroll: true })
    }, [])

    useEffect(() => {
        if (!open) return
        focusablesIn(menuRef.current)[0]?.focus({ preventScroll: true })
        function onDown(e) {
            if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) close(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open, close])

    function onMenuKey(e) {
        const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')]
        const i = items.indexOf(document.activeElement)
        if (e.key === 'Escape')    { e.preventDefault(); close(true) }
        else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
        else if (e.key === 'ArrowUp')   { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
        else if (e.key === 'Tab')  { close(false) }
    }

    return (
        <div className="admin-account">
            <button
                ref={btnRef}
                type="button"
                className="admin-userbtn"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Account menu"
                onClick={() => setOpen(v => !v)}
            >
                <Avatar name={name} size="sm" />
                <ChevronDown size={16} className="admin-userbtn-chev" aria-hidden="true" />
            </button>
            {open && (
                <div ref={menuRef} className="admin-menu" role="menu" aria-label="Account" onKeyDown={onMenuKey}>
                    <div className="admin-menu-hd">
                        <div className="admin-menu-name">{name}</div>
                        <div className="admin-menu-role">{user?.email}</div>
                        {role === 'finder' && <div className="admin-menu-role">Finder: Ask AI only</div>}
                    </div>
                    <a role="menuitem" href="/" target="_blank" rel="noopener" onClick={() => close(false)}>
                        <ExternalLink size={16} aria-hidden="true" /> View public site
                    </a>
                    <a role="menuitem" href="/how-to.html" target="_blank" rel="noopener" onClick={() => close(false)}>
                        <BookOpen size={16} aria-hidden="true" /> How-to guide
                    </a>
                    {realRole === 'admin' && (
                        <button role="menuitem" type="button" onClick={() => { close(false); onPreview(!previewing) }}>
                            <UserRoundSearch size={16} aria-hidden="true" /> {previewing ? 'Back to admin view' : 'View as Finder'}
                        </button>
                    )}
                    <button role="menuitem" type="button" onClick={() => { close(false); setPwOpen(true) }}>
                        <KeyRound size={16} aria-hidden="true" /> Change password
                    </button>
                    <hr />
                    <button role="menuitem" type="button" className="danger" onClick={() => { close(false); onLogout() }}>
                        <LogOut size={16} aria-hidden="true" /> Log out
                    </button>
                </div>
            )}
            {pwOpen && <ChangePasswordDialog onClose={() => { setPwOpen(false); btnRef.current?.focus({ preventScroll: true }) }} />}
        </div>
    )
}

// ── Login (logged-out frame) ─────────────────────────────────────────────────
function AdminLogin({ checking }) {
    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [error, setError]       = useState('')
    const [loading, setLoading]   = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    async function handleLogin(e) {
        e.preventDefault()
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            console.error(error)
            setError(/invalid login/i.test(error.message)
                ? 'That email and password do not match. Check them and try again.'
                : 'You could not be signed in right now. Try again in a moment.')
        }
        setLoading(false)
    }

    return (
        <div className="admin-login">
            <img className="admin-login-logo" src="/mtech-testimonials-logo-white.svg" alt="Mtech Testimonials" />
            {checking ? (
                <div className="admin-login-card" aria-busy="true">
                    <p className="admin-login-sub">Loading…</p>
                </div>
            ) : (
                <form className="admin-login-card" onSubmit={handleLogin} noValidate={false}>
                    <h1>Admin sign in</h1>
                    <p className="admin-login-sub">Mtech Testimonials admin for Mannatech SA</p>
                    <div className="admin-login-field">
                        <label htmlFor="admin-email">Email address</label>
                        <input
                            id="admin-email"
                            type="email"
                            autoComplete="username"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className={error ? 'input-error' : ''}
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? 'admin-login-error' : undefined}
                            autoFocus
                            required
                        />
                    </div>
                    <div className="admin-login-field">
                        <label htmlFor="admin-password">Password</label>
                        <div className="password-field">
                            <input
                                id="admin-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="Your password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className={error ? 'input-error' : ''}
                                aria-invalid={error ? true : undefined}
                                aria-describedby={error ? 'admin-login-error' : undefined}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(v => !v)}
                                aria-pressed={showPassword}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    {error && <div id="admin-login-error"><Alert type="error">{error}</Alert></div>}
                    <button type="submit" className="btn-primary admin-login-submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            )}
            <a className="admin-login-back" href="/">
                <ChevronLeft size={16} aria-hidden="true" /> Back to the public site
            </a>
        </div>
    )
}

// ── Layout ───────────────────────────────────────────────────────────────────
export default function AdminLayout() {
    const [session, setSession] = useState(undefined) // undefined = loading
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const [role, setRole] = useState({ userId: null, value: null }) // value null = loading
    const [countTick, setCountTick] = useState(0)
    const { privateMode } = useSiteSettings()
    const isDrawer = useMediaQuery('(max-width: 959.98px)')
    const navigate = useNavigate()
    const location = useLocation()
    const hamburgerRef = useRef(null)
    const drawerRef    = useRef(null)
    const mainRef      = useRef(null)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
        return () => subscription.unsubscribe()
    }, [])

    // Role for the signed-in user (admin or finder); reloaded when the user changes
    const userId = session?.user?.id || null
    useEffect(() => {
        if (!userId) return
        let cancelled = false
        fetchRole(userId).then(value => { if (!cancelled) setRole({ userId, value }) })
        return () => { cancelled = true }
    }, [userId])
    const realRole = role.userId === userId ? role.value : null

    // Admins can preview the Finder view (account menu); finders cannot switch
    const [previewing, setPreviewing] = useState(isViewingAsFinder)
    const roleValue = realRole === 'admin' && previewing ? 'finder' : realRole

    function togglePreview(on) {
        setViewingAsFinder(on)
        setPreviewing(on)
        navigate(on ? FINDER_HOME : '/admin/dashboard')
    }

    // Pending Review count (hidden at 0). Refreshed on every page change.
    useEffect(() => {
        if (!session || roleValue !== 'admin') return
        let cancelled = false
        supabase.from('testimonials').select('id', { count: 'exact', head: true }).eq('status', 'pending')
            .then(({ count }) => { if (!cancelled) setPendingCount(count || 0) })
        return () => { cancelled = true }
    }, [session, roleValue, location.pathname, countTick])

    // Pages that change a status (Pending Review) ask for a recount.
    useEffect(() => {
        const bump = () => setCountTick(n => n + 1)
        window.addEventListener('admin:pending-changed', bump)
        return () => window.removeEventListener('admin:pending-changed', bump)
    }, [])

    const closeDrawer = useCallback(() => setDrawerOpen(false), [])

    // Choosing a page, or leaving drawer widths, closes the drawer. Adjusted
    // while rendering (React's pattern for resetting state on a change).
    const [drawerFor, setDrawerFor] = useState({ path: location.pathname, isDrawer })
    if (drawerFor.path !== location.pathname || drawerFor.isDrawer !== isDrawer) {
        setDrawerFor({ path: location.pathname, isDrawer })
        if (drawerOpen) setDrawerOpen(false)
    }

    // Drawer: focus in, Tab trapped, Escape closes, body scroll locked.
    useEffect(() => {
        if (!drawerOpen) return
        const el = drawerRef.current
        focusablesIn(el)[0]?.focus({ preventScroll: true })
        document.body.style.overflow = 'hidden'
        function onKey(e) {
            if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return }
            if (e.key !== 'Tab') return
            const f = focusablesIn(el)
            if (!f.length) return
            const first = f[0], last = f[f.length - 1]
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        }
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = ''
            // Focus returns to the hamburger however the drawer closed.
            hamburgerRef.current?.focus({ preventScroll: true })
        }
    }, [drawerOpen, closeDrawer])

    async function handleLogout() {
        setViewingAsFinder(false)
        await supabase.auth.signOut()
        navigate('/admin')
    }

    function skipToContent(e) {
        e.preventDefault()
        mainRef.current?.focus()
    }

    if (session === undefined) return <AdminLogin checking />
    if (!session) return <AdminLogin />
    if (!roleValue) return <AdminLogin checking />

    // Finders only have Ask AI; any other admin address goes there
    const isFinder = roleValue === 'finder'
    if (isFinder && !finderMayOpen(location.pathname)) return <Navigate to={FINDER_HOME} replace />

    const crumbs = crumbsFor(location.pathname)
    const pageName = crumbs[crumbs.length - 1].label
    const drawerProps = isDrawer
        ? { role: 'dialog', 'aria-modal': drawerOpen ? true : undefined, 'aria-label': 'Admin menu', 'aria-hidden': drawerOpen ? undefined : true }
        : {}

    return (
        <div className="admin-layout">
            <a className="skip-link" href="#admin-main" onClick={skipToContent}>Skip to content</a>

            <aside
                ref={drawerRef}
                id="admin-sidebar"
                className={`admin-sidebar ${drawerOpen ? 'is-open' : ''}`}
                {...drawerProps}
            >
                {isDrawer && (
                    <button type="button" className="admin-drawer-close" onClick={closeDrawer} aria-label="Close menu">
                        <X size={18} aria-hidden="true" />
                    </button>
                )}
                <nav className="admin-nav" aria-label="Admin">
                    <Link
                        to={isFinder ? FINDER_HOME : '/admin/dashboard'}
                        className="admin-brand"
                        aria-label={isFinder ? 'Mtech Testimonials, go to Ask AI' : 'Mtech Testimonials admin, go to Dashboard'}
                    >
                        <img src="/mtech-testimonials-logo-white.svg" alt="" />
                        <span className="admin-brand-tag">{isFinder ? 'Finder' : 'Admin'}</span>
                    </Link>
                    {navFor(roleValue).map(group => (
                        <div key={group.label} className="admin-nav-group">
                            <div className="admin-nav-label">{group.label}</div>
                            {group.items.map(item => {
                                const active = isActive(item, location.pathname)
                                return (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        className="admin-nav-item"
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        <item.Icon size={18} aria-hidden="true" />
                                        <span className="admin-nav-text">{item.label}</span>
                                        {item.count && pendingCount > 0 && (
                                            <span className="admin-nav-count">
                                                {pendingCount}<span className="sr-only"> waiting</span>
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    ))}
                </nav>
            </aside>
            {isDrawer && (
                <div
                    className={`admin-drawer-backdrop ${drawerOpen ? 'is-open' : ''}`}
                    onClick={closeDrawer}
                    aria-hidden="true"
                />
            )}

            <div className="admin-main">
                <header className="admin-topbar">
                    <button
                        ref={hamburgerRef}
                        type="button"
                        className="admin-hamburger"
                        aria-label="Open menu"
                        aria-expanded={drawerOpen}
                        aria-controls="admin-sidebar"
                        onClick={() => setDrawerOpen(true)}
                    >
                        <Menu size={20} aria-hidden="true" />
                    </button>
                    <nav className="admin-crumb" aria-label="Breadcrumb">
                        <ol>
                            {crumbs.map((c, i) => (
                                <li key={i}>
                                    {i > 0 && <ChevronRight size={16} className="admin-crumb-sep" aria-hidden="true" />}
                                    {c.to
                                        ? <Link to={c.to}>{c.label}</Link>
                                        : <span aria-current="page">{c.label}</span>}
                                </li>
                            ))}
                        </ol>
                    </nav>
                    <strong className="admin-ptitle">{pageName}</strong>
                    <span className="admin-topbar-spacer" />
                    {privateMode && (
                        <span className="admin-private" role="status">
                            <Lock size={16} aria-hidden="true" />
                            <span className="admin-private-text">Private mode on</span>
                        </span>
                    )}
                    {!isFinder && (
                        <Link to="/admin/ask" className="admin-ask">
                            <Sparkles size={18} aria-hidden="true" />
                            <span>Ask AI about any testimonial</span>
                        </Link>
                    )}
                    <AccountMenu user={session.user} role={roleValue} realRole={realRole} previewing={previewing && realRole === 'admin'} onPreview={togglePreview} onLogout={handleLogout} />
                </header>
                {previewing && realRole === 'admin' && (
                    <div className="admin-preview-bar" role="status">
                        <UserRoundSearch size={18} aria-hidden="true" />
                        <span><strong>Viewing as Finder.</strong> You see what a Finder sees: Ask AI over published testimonials only.</span>
                        <button type="button" onClick={() => togglePreview(false)}>Back to admin view</button>
                    </div>
                )}
                <main id="admin-main" ref={mainRef} tabIndex={-1} className="admin-content">
                    <Outlet context={{ role: roleValue }} />
                </main>
            </div>
        </div>
    )
}
