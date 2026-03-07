import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { X, ArrowRight } from 'lucide-react'

export default function SearchBar() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const debounceRef = useRef(null)
    const wrapperRef = useRef(null)
    const navigate = useNavigate()

    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (!query.trim()) {
            setResults([])
            setOpen(false)
            return
        }

        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            const q = query.toLowerCase()

            const { data } = await supabase
                .from('testimonials')
                .select('id, slug, title, person_name, story_text, conditions, products')
                .eq('status', 'approved')
                .or(`title.ilike.%${q}%,person_name.ilike.%${q}%,story_text.ilike.%${q}%`)
                .limit(6)

            const { data: tagData } = await supabase
                .from('testimonials')
                .select('id, slug, title, person_name, story_text, conditions, products')
                .eq('status', 'approved')
                .limit(100)

            const tagMatches = (tagData || []).filter(t =>
                t.conditions?.some(c => c.toLowerCase().includes(q)) ||
                t.products?.some(p => p.toLowerCase().includes(q))
            )

            const seen = new Set()
            const merged = [...(data || []), ...tagMatches].filter(t => {
                if (seen.has(t.id)) return false
                seen.add(t.id)
                return true
            }).slice(0, 6)

            setResults(merged)
            setOpen(merged.length > 0)
            setLoading(false)
        }, 250)
    }, [query])

    function handleKeyDown(e) {
        if (e.key === 'Enter' && query.trim()) {
            setOpen(false)
            navigate(`/search?q=${encodeURIComponent(query.trim())}`)
        }
        if (e.key === 'Escape') setOpen(false)
    }

    function handleSearch() {
        if (query.trim()) {
            setOpen(false)
            navigate(`/search?q=${encodeURIComponent(query.trim())}`)
        }
    }

    function handleSelect(t) {
        setOpen(false)
        setQuery('')
        navigate(`/testimonial/${t.slug || t.id}`)
    }

    function getExcerpt(text) {
        if (!text) return ''
        return text.replace(/<[^>]*>/g, '').slice(0, 80) + '…'
    }

    return (
        <div className="search-wrapper" ref={wrapperRef}>
            <div className="search-bar">
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder="Search by condition, product, or keyword..."
                    className="search-input"
                    autoComplete="off"
                />
                {query && (
                    <button className="search-clear" onClick={() => { setQuery(''); setResults([]); setOpen(false) }}>
                        <X size={14} />
                    </button>
                )}
                <button className="search-btn" onClick={handleSearch}>Search</button>
            </div>

            {open && (
                <div className="search-dropdown">
                    {loading && <div className="search-dropdown-loading">Searching…</div>}
                    {!loading && results.map(t => (
                        <div
                            key={t.id}
                            className="search-dropdown-item"
                            onMouseDown={() => handleSelect(t)}
                        >
                            <div className="search-item-title">{t.title}</div>
                            {t.person_name && (
                                <div className="search-item-author">{t.person_name}</div>
                            )}
                            <div className="search-item-excerpt">{getExcerpt(t.story_text)}</div>
                            <div className="search-item-tags">
                                {(t.products || []).slice(0, 2).map(p => (
                                    <span key={p} className="search-tag search-tag-product">{p}</span>
                                ))}
                                {(t.conditions || []).slice(0, 2).map(c => (
                                    <span key={c} className="search-tag search-tag-condition">{c}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                    {!loading && results.length > 0 && (
                        <div className="search-dropdown-footer" onMouseDown={handleSearch}>
                            See all results for "<strong>{query}</strong>" <ArrowRight size={13} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
