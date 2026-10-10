import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, X, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProducts, useConditions } from '../lib/ProductsContext'

// ── Hook: detect mobile ───────────────────────────────────────────────────────
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        const handler = e => setIsMobile(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])
    return isMobile
}

// ── Shared live-filter search box ─────────────────────────────────────────────
function NavSearch({ title, query, setQuery, autoFocus }) {
    return (
        <div className="nav-search">
            <Search size={16} className="nav-search-icon" />
            <input
                className="nav-search-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${title.replace(/^View by /i, '').toLowerCase()}…`}
                autoComplete="off"
                autoFocus={autoFocus}
            />
            {query && (
                <button className="nav-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                    <X size={15} />
                </button>
            )}
        </div>
    )
}

function filterItems(items, query) {
    const q = query.trim().toLowerCase()
    return q ? items.filter(i => i.toLowerCase().includes(q)) : items
}

// ── Bottom sheet (mobile) ─────────────────────────────────────────────────────
function BottomSheet({ title, items, counts = {}, open, onClose, onSelect, activeFilter }) {
    const [query, setQuery] = useState('')

    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden'
        else       document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    useEffect(() => { if (!open) setQuery('') }, [open])

    if (!open) return null

    const q = query.trim()
    const filtered = filterItems(items, query)

    return (
        <>
            <div className="bs-backdrop" onClick={onClose} />
            <div className="bs-sheet">
                <div className="bs-handle" />
                <div className="bs-header">
                    <span className="bs-title">{title}</span>
                    <button className="bs-close" onClick={onClose}><X size={20} /></button>
                </div>
                <NavSearch title={title} query={query} setQuery={setQuery} />
                <div className="bs-list">
                    {!q && (
                        <button className={`bs-item bs-item-all ${!activeFilter ? 'bs-item-active' : ''}`} onClick={() => { onSelect(null); onClose() }}>
                            <span>All testimonials</span>
                        </button>
                    )}
                    {filtered.map(item => (
                        <button
                            key={item}
                            className={`bs-item ${activeFilter === item ? 'bs-item-active' : ''}`}
                            onClick={() => { onSelect(item); onClose() }}
                        >
                            <span>{item}</span>
                            {counts[item] > 0 && (
                                <span className="bs-count">{counts[item]}</span>
                            )}
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <p className="nav-search-empty">No matches for “{q}”</p>
                    )}
                </div>
            </div>
        </>
    )
}

// ── Desktop side drawer ───────────────────────────────────────────────────────
function SideDrawer({ title, items, counts = {}, open, onClose, onSelect, activeFilter }) {
    const [query, setQuery] = useState('')

    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden'
        else       document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    useEffect(() => {
        if (!open) { setQuery(''); return }
        function onKey(e) { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null

    const q = query.trim()
    const filtered = filterItems(items, query)

    return (
        <>
            <div className="drawer-backdrop" onClick={onClose} />
            <div className="side-drawer" role="dialog" aria-label={title}>
                <div className="drawer-header">
                    <span className="drawer-title">{title}</span>
                    <button className="drawer-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
                </div>
                <NavSearch title={title} query={query} setQuery={setQuery} autoFocus />
                <div className="drawer-list">
                    {!q && (
                        <button
                            className={`drawer-item drawer-item-all ${!activeFilter ? 'drawer-item-active' : ''}`}
                            onClick={() => { onSelect(null); onClose() }}
                        >
                            <span>All testimonials</span>
                        </button>
                    )}
                    {filtered.map(item => (
                        <button
                            key={item}
                            className={`drawer-item ${activeFilter === item ? 'drawer-item-active' : ''}`}
                            onClick={() => { onSelect(item); onClose() }}
                        >
                            <span>{item}</span>
                            {counts[item] > 0 && (
                                <span className="drawer-count">{counts[item]}</span>
                            )}
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <p className="nav-search-empty">No matches for “{q}”</p>
                    )}
                </div>
            </div>
        </>
    )
}

// ── Smart menu ────────────────────────────────────────────────────────────────
function NavMenu({ desktopLabel, mobileLabel, items, counts, onSelect, activeFilter }) {
    const isMobile = useIsMobile()
    const [open, setOpen] = useState(false)
    const hasActive = items.includes(activeFilter)

    const Panel = isMobile ? BottomSheet : SideDrawer

    return (
        <div className="nav-dropdown">
            <button
                className={`nav-dropdown-trigger ${isMobile ? 'mobile' : ''} ${open ? 'active' : ''} ${hasActive ? 'has-active-filter' : ''}`}
                onClick={() => setOpen(true)}
            >
                {isMobile ? mobileLabel : desktopLabel}
                {isMobile
                    ? <ChevronDown size={13} className={`nav-chevron ${open ? 'flipped' : ''}`} />
                    : <ChevronRight size={14} className="nav-chevron" />}
            </button>
            <Panel
                title={desktopLabel}
                items={items}
                counts={counts}
                open={open}
                onClose={() => setOpen(false)}
                onSelect={onSelect}
                activeFilter={activeFilter}
            />
        </div>
    )
}

// ── Active filter chip ────────────────────────────────────────────────────────
function ActiveFilterChip() {
    const [searchParams, setSearchParams] = useSearchParams()
    const activeFilter = searchParams.get('filter')

    if (!activeFilter) return null

    return (
        <div className="filter-chip-bar">
            <span className="filter-chip-label">Filtered by:</span>
            <span className="filter-chip">
                {activeFilter}
                <button
                    className="filter-chip-clear"
                    onClick={() => setSearchParams({})}
                    aria-label="Clear filter"
                >
                    <X size={12} />
                </button>
            </span>
        </div>
    )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar() {
    const products   = useProducts()
    const conditions = useConditions()
    const navigate   = useNavigate()
    const [searchParams] = useSearchParams()
    const activeFilter   = searchParams.get('filter') || null
    const [counts, setCounts] = useState({})

    useEffect(() => {
        async function fetchCounts() {
            const { data } = await supabase
                .from('testimonials')
                .select('conditions, products')
                .eq('status', 'approved')
            if (data) {
                const countMap = {}
                data.forEach(t => {
                    ;(t.conditions || []).forEach(c => { countMap[c] = (countMap[c] || 0) + 1 })
                    ;(t.products   || []).forEach(p => { countMap[p] = (countMap[p] || 0) + 1 })
                })
                setCounts(countMap)
            }
        }
        fetchCounts()
    }, [])

    function handleFilter(value) {
        if (value) navigate(`/?filter=${encodeURIComponent(value)}`)
        else       navigate('/')
    }

    return (
        <>
            {/* Main navbar */}
            <nav className="navbar">
                <Link to="/" className="navbar-brand">
                    <img src="/mtech-testimonials-logo.svg" alt="MTech Testimonials" className="navbar-logo" />
                </Link>
                <div className="navbar-links">
                    <NavMenu
                        desktopLabel="View by Condition"
                        mobileLabel="Conditions"
                        items={conditions.filter(c => counts[c] > 0)}
                        counts={counts}
                        onSelect={handleFilter}
                        activeFilter={activeFilter}
                    />
                    <NavMenu
                        desktopLabel="View by Product"
                        mobileLabel="Products"
                        items={products.filter(p => counts[p] > 0)}
                        counts={counts}
                        onSelect={handleFilter}
                        activeFilter={activeFilter}
                    />
                </div>
            </nav>

            {/* Active filter chip — shows on any page when ?filter= is in URL */}
            <ActiveFilterChip />
        </>
    )
}
