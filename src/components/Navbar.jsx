import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PRODUCTS } from '../lib/constants'

function DropdownMenu({ label, items, onSelect }) {
    const [open, setOpen] = useState(false)
    const ref = useRef()

    // Close when clicking outside
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
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function Navbar() {
    const [conditions, setConditions] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        async function fetchConditions() {
            const { data } = await supabase
                .from('testimonials')
                .select('conditions')
                .eq('status', 'approved')
            if (data) {
                const all = [...new Set(data.flatMap(t => t.conditions || []))].sort()
                setConditions(all)
            }
        }
        fetchConditions()
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
                        items={conditions}
                        onSelect={handleFilter}
                    />
                    <DropdownMenu
                        label="View by Product"
                        items={PRODUCTS}
                        onSelect={handleFilter}
                    />
                </div>
            </nav>
        </>
    )
}
