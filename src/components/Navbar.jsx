import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
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

// ── Bottom sheet (mobile) ─────────────────────────────────────────────────────
function BottomSheet({ title, items, counts = {}, open, onClose, onSelect }) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden'
        else       document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    if (!open) return null

    return (
        <>
            <div className="bs-backdrop" onClick={onClose} />
            <div className="bs-sheet">
                <div className="bs-handle" />
                <div className="bs-header">
                    <span className="bs-title">{title}</span>
                    <button className="bs-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="bs-list">
                    {/* View All entry */}
                    <button className="bs-item bs-item-all" onClick={() => { onSelect(null); onClose() }}>
                        <span>All testimonials</span>
                    </button>
                    {items.map(item => (
                        <button
                            key={item}
                            className="bs-item"
                            onClick={() => { onSelect(item); onClose() }}
                        >
                            <span>{item}</span>
                            {counts[item] > 0 && (
                                <span className="bs-count">{counts[item]}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </>
    )
}

// ── Desktop dropdown ──────────────────────────────────────────────────────────
function DesktopDropdown({ label, items, counts = {}, onSelect }) {
    const [open, setOpen] = useState(false)
    const ref = useRef()

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    return (
        <div className="nav-dropdown" ref={ref}>
            <button
                className={`nav-dropdown-trigger ${open ? 'active' : ''}`}
                onClick={() => setOpen(o => !o)}
            >
                {label}
                <ChevronDown size={14} className={`nav-chevron ${open ? 'flipped' : ''}`} />
            </button>
            {open && (
                <div className="nav-dropdown-menu">
                    <div className="nav-dropdown-scroll">
                        {/* View All entry */}
                        <button
                            className="nav-dropdown-item nav-dropdown-item-all"
                            onClick={() => { onSelect(null); setOpen(false) }}
                        >
                            <span>All testimonials</span>
                        </button>
                        <div className="nav-dropdown-divider" />
                        {items.map(item => (
                            <button
                                key={item}
                                className="nav-dropdown-item"
                                onClick={() => { onSelect(item); setOpen(false) }}
                            >
                                <span>{item}</span>
                                {counts[item] > 0 && (
                                    <span className="nav-dropdown-count">{counts[item]}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Smart menu ────────────────────────────────────────────────────────────────
function NavMenu({ desktopLabel, mobileLabel, items, counts, onSelect }) {
    const isMobile = useIsMobile()
    const [open, setOpen] = useState(false)

    if (isMobile) {
        return (
            <>
                <button
                    className={`nav-dropdown-trigger mobile ${open ? 'active' : ''}`}
                    onClick={() => setOpen(true)}
                >
                    {mobileLabel}
                    <ChevronDown size={13} className="nav-chevron" />
                </button>
                <BottomSheet
                    title={desktopLabel}
                    items={items}
                    counts={counts}
                    open={open}
                    onClose={() => setOpen(false)}
                    onSelect={onSelect}
                />
            </>
        )
    }

    return (
        <DesktopDropdown
            label={desktopLabel}
            items={items}
            counts={counts}
            onSelect={onSelect}
        />
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
                    />
                    <NavMenu
                        desktopLabel="View by Product"
                        mobileLabel="Products"
                        items={products.filter(p => counts[p] > 0)}
                        counts={counts}
                        onSelect={handleFilter}
                    />
                </div>
            </nav>

            {/* Active filter chip — shows on any page when ?filter= is in URL */}
            <ActiveFilterChip />
        </>
    )
}
