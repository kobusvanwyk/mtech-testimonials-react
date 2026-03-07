import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProducts, useConditions } from '../lib/ProductsContext'

function DropdownMenu({ label, items, counts = {}, onSelect }) {
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
        navigate(`/?filter=${encodeURIComponent(value)}`)
    }

    return (
        <>
            {/* Top bar — Share your story CTA */}
            <div className="navbar-topbar">
                <span>Have a Mannatech success story?</span>
                <Link to="/submit" className="navbar-topbar-btn">
                    Share Your Story
                </Link>
            </div>

            {/* Main navbar */}
            <nav className="navbar">
                <Link to="/" className="navbar-brand">
                    <img
                        src="/mtech-testimonials-logo.svg"
                        alt="MTech Testimonials"
                        className="navbar-logo"
                    />
                </Link>
                <div className="navbar-links">
                    <DropdownMenu
                        label="View by Condition"
                        items={conditions.filter(c => counts[c] > 0)}
                        counts={counts}
                        onSelect={handleFilter}
                    />
                    <DropdownMenu
                        label="View by Product"
                        items={products.filter(p => counts[p] > 0)}
                        counts={counts}
                        onSelect={handleFilter}
                    />
                </div>
            </nav>
        </>
    )
}
