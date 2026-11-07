import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, ChevronLeft, X, Search, Menu } from 'lucide-react'
import { useProducts, useConditions } from '../lib/ProductsContext'
import { useDialog } from '../lib/useDialog'
import { useTagCounts } from '../lib/useTagCounts'

// Public navbar (ui-guide #shell-public, DESIGN.md "App shell"): white bar,
// colour logo, teal-to-lime line. Desktop: two searchable browse menus (filter
// field, A to Z groups with counts, highlighted matches, arrow keys, Escape).
// Mobile (below 768px): a hamburger opens a right-hand drawer whose rows open
// the full browse lists.

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        const handler = e => setIsMobile(e.matches)
        handler(mq)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])
    return isMobile
}

// Name with the matched part wrapped in <mark>.
function Highlight({ text, query }) {
    const q = query.trim().toLowerCase()
    const i = q ? text.toLowerCase().indexOf(q) : -1
    if (i < 0) return text
    return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
}

// Filter field + A to Z grouped option list + footer. Shared by the desktop
// dropdown and the mobile drawer list.
function BrowseList({ noun, items, counts, query, setQuery, activeFilter, onSelect, onEscape, autoFocus }) {
    const listRef  = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => { if (autoFocus) inputRef.current?.focus({ preventScroll: true }) }, [autoFocus])

    const q = query.trim().toLowerCase()
    const shown = useMemo(
        () => [...items].filter(i => !q || i.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b)),
        [items, q]
    )
    const groups = useMemo(() => {
        const map = new Map()
        shown.forEach(name => {
            const ch = name[0]?.toUpperCase() || '#'
            const letter = /[A-Z]/.test(ch) ? ch : '#'
            if (!map.has(letter)) map.set(letter, [])
            map.get(letter).push(name)
        })
        return [...map.entries()]
    }, [shown])

    function options() { return [...(listRef.current?.querySelectorAll('[role="option"]') || [])] }

    function onKeyDown(e) {
        const opts = options()
        const i = opts.indexOf(document.activeElement)
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            ;(opts[i + 1] || opts[0])?.focus()
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (i <= 0) inputRef.current?.focus()
            else opts[i - 1].focus()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onEscape?.()
        }
    }

    return (
        <div className="browse" onKeyDown={onKeyDown}>
            <div className="browse-q">
                <Search size={16} aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={`Filter ${items.length} ${noun}`}
                    aria-label={`Filter ${noun}`}
                    autoComplete="off"
                />
            </div>
            <div className="browse-list" role="listbox" aria-label={noun} ref={listRef}>
                {groups.map(([letter, names]) => (
                    <div key={letter} className="browse-group">
                        <div className="browse-letter" aria-hidden="true">{letter}</div>
                        {names.map(name => (
                            <button
                                key={name}
                                type="button"
                                role="option"
                                aria-selected={activeFilter === name}
                                className="browse-opt"
                                onClick={() => onSelect(name)}
                            >
                                <span className="browse-nm"><Highlight text={name} query={query} /></span>
                                <span className="browse-ct">{counts[name] || 0}</span>
                            </button>
                        ))}
                    </div>
                ))}
                {shown.length === 0 && (
                    <p className="browse-empty">No {noun} match <q>{query.trim()}</q></p>
                )}
            </div>
            <div className="browse-foot" aria-live="polite">
                <span>{shown.length} shown</span>
                <span>{items.length} in total</span>
            </div>
        </div>
    )
}

// ── Desktop: searchable dropdown under its trigger ───────────────────────────
function BrowseMenu({ label, noun, items, counts, activeFilter, onSelect }) {
    const [open, setOpen]   = useState(false)
    const [query, setQuery] = useState('')
    const wrapRef = useRef(null)
    const btnRef  = useRef(null)
    const hasActive = items.includes(activeFilter)

    const close = useCallback((returnFocus) => {
        setOpen(false)
        setQuery('')
        if (returnFocus) btnRef.current?.focus({ preventScroll: true })
    }, [])

    useEffect(() => {
        if (!open) return
        function onDown(e) { if (!wrapRef.current?.contains(e.target)) close(false) }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open, close])

    return (
        <div className="browse-wrap" ref={wrapRef}>
            <button
                ref={btnRef}
                type="button"
                className={`nav-dropdown-trigger ${hasActive ? 'has-active-filter' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => (open ? close(false) : setOpen(true))}
            >
                {label}
                <ChevronDown size={16} className="nav-chevron" aria-hidden="true" />
            </button>
            {open && (
                <div className="browse-dd" role="dialog" aria-label={`Browse by ${noun.replace(/s$/, '')}`}>
                    <BrowseList
                        noun={noun}
                        items={items}
                        counts={counts}
                        query={query}
                        setQuery={setQuery}
                        activeFilter={activeFilter}
                        onSelect={name => { close(false); onSelect(name) }}
                        onEscape={() => close(true)}
                        autoFocus
                    />
                </div>
            )}
        </div>
    )
}

// ── Mobile: right-hand drawer; rows open the full browse lists ───────────────
function MobileMenu({ conditions, products, counts, activeFilter, onSelect }) {
    const [open, setOpen]   = useState(false)
    const [view, setView]   = useState('menu') // 'menu' | 'conditions' | 'products'
    const [query, setQuery] = useState('')
    const location = useLocation()

    const close = useCallback(() => { setOpen(false); setView('menu'); setQuery('') }, [])
    const dialogRef = useDialog(open, () => (view === 'menu' ? close() : (setView('menu'), setQuery(''))))

    // Choosing a page closes the drawer (adjusted while rendering).
    const here = location.pathname + location.search
    const [openedAt, setOpenedAt] = useState(here)
    if (openedAt !== here) {
        setOpenedAt(here)
        if (open) close()
    }

    const lists = {
        conditions: { title: 'View by Condition', noun: 'conditions', items: conditions },
        products:   { title: 'View by Product',   noun: 'products',   items: products },
    }
    const list = lists[view]

    return (
        <>
            <button
                type="button"
                className="icon-btn nav-hamburger"
                aria-label="Open menu"
                aria-expanded={open}
                onClick={() => setOpen(true)}
            >
                <Menu size={20} aria-hidden="true" />
            </button>
            {open && (
                <>
                    <div className="pub-backdrop" onClick={close} aria-hidden="true" />
                    <div className="pub-drawer" role="dialog" aria-modal="true" aria-label="Site menu" ref={dialogRef}>
                        <button type="button" className="pub-drawer-close" onClick={close} aria-label="Close menu">
                            <X size={18} aria-hidden="true" />
                        </button>
                        {view === 'menu' ? (
                            <div className="pub-drawer-body">
                                <h2 className="pub-drawer-title">Browse testimonials</h2>
                                <button type="button" className="pub-drow" onClick={() => setView('conditions')}>
                                    View by Condition <span className="ct">{conditions.length}</span>
                                    <ChevronRight size={18} aria-hidden="true" />
                                </button>
                                <button type="button" className="pub-drow" onClick={() => setView('products')}>
                                    View by Product <span className="ct">{products.length}</span>
                                    <ChevronRight size={18} aria-hidden="true" />
                                </button>
                                <a className="pub-drow" href="/how-to.html">
                                    How to use this site <span className="ct" />
                                    <ChevronRight size={18} aria-hidden="true" />
                                </a>
                                <Link to="/submit" className="btn-primary pub-drawer-cta" onClick={close}>
                                    Submit your testimonial
                                </Link>
                            </div>
                        ) : (
                            <div className="pub-drawer-body pub-drawer-body--list">
                                <button type="button" className="pub-drawer-back" onClick={() => { setView('menu'); setQuery('') }}>
                                    <ChevronLeft size={18} aria-hidden="true" /> {list.title}
                                </button>
                                <BrowseList
                                    noun={list.noun}
                                    items={list.items}
                                    counts={counts}
                                    query={query}
                                    setQuery={setQuery}
                                    activeFilter={activeFilter}
                                    onSelect={name => { close(); onSelect(name) }}
                                    onEscape={() => { setView('menu'); setQuery('') }}
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    )
}

// ── Navbar ───────────────────────────────────────────────────────────────────
export default function Navbar() {
    const products   = useProducts()
    const conditions = useConditions()
    const navigate   = useNavigate()
    const isMobile   = useIsMobile()
    const [searchParams] = useSearchParams()
    const activeFilter   = searchParams.get('filter') || null
    const { counts } = useTagCounts()

    function handleFilter(value) {
        if (value) navigate(`/?filter=${encodeURIComponent(value)}`)
        else       navigate('/')
    }

    const condItems = conditions.filter(c => counts[c] > 0)
    const prodItems = products.filter(p => counts[p] > 0)

    return (
        <>
            <nav className="navbar" aria-label="Main">
                <Link to="/" className="navbar-brand">
                    <img src="/mtech-testimonials-logo.svg" alt="Mtech Testimonials" className="navbar-logo" />
                </Link>
                <div className="navbar-links">
                    {isMobile ? (
                        <MobileMenu
                            conditions={condItems}
                            products={prodItems}
                            counts={counts}
                            activeFilter={activeFilter}
                            onSelect={handleFilter}
                        />
                    ) : (
                        <>
                            <BrowseMenu label="View by Condition" noun="conditions" items={condItems} counts={counts} activeFilter={activeFilter} onSelect={handleFilter} />
                            <BrowseMenu label="View by Product" noun="products" items={prodItems} counts={counts} activeFilter={activeFilter} onSelect={handleFilter} />
                        </>
                    )}
                </div>
            </nav>
        </>
    )
}
