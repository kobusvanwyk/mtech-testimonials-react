import { useState, useEffect, useRef } from 'react'
import { storyExcerpt } from '../lib/storyText'
import { displayName, hidesAuthor } from '../lib/displayName'
import { useSiteSettings } from '../lib/SiteSettingsContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { X, ArrowRight, Search } from 'lucide-react'

const getExcerpt = text => storyExcerpt(text, 110)

// Home search with suggestions (ARIA combobox): arrow keys move through the
// suggestions and "See all results", Enter opens, Escape closes.
export default function SearchBar() {
    const { nameDisplay, showDates } = useSiteSettings()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [active, setActive] = useState(-1) // highlighted option (keyboard)
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
                .select('id, slug, title, person_name, anonymous, created_at, story_text, conditions, products')
                .eq('status', 'approved')
                .or(nameDisplay === 'full'
                    ? `title.ilike.%${q}%,person_name.ilike.%${q}%,story_text.ilike.%${q}%`
                    : `title.ilike.%${q}%,story_text.ilike.%${q}%`)
                .limit(6)

            const { data: tagData } = await supabase
                .from('testimonials')
                .select('id, slug, title, person_name, anonymous, created_at, story_text, conditions, products')
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
    }, [query, nameDisplay])

    const listOpen = open && !loading && results.length > 0
    const optionCount = results.length + 1 // suggestions + "See all results"

    function handleKeyDown(e) {
        if (e.key === 'ArrowDown' && results.length) {
            e.preventDefault()
            setOpen(true)
            setActive(i => (i + 1) % optionCount)
        } else if (e.key === 'ArrowUp' && results.length) {
            e.preventDefault()
            setOpen(true)
            setActive(i => (i <= 0 ? optionCount - 1 : i - 1))
        } else if (e.key === 'Enter') {
            if (listOpen && active >= 0 && active < results.length) {
                e.preventDefault()
                handleSelect(results[active])
            } else if (query.trim()) {
                handleSearch()
            }
        } else if (e.key === 'Escape') {
            if (open) { e.preventDefault(); setOpen(false); setActive(-1) }
        }
    }

    function handleSearch() {
        if (query.trim()) {
            setOpen(false)
            setActive(-1)
            navigate(`/search?q=${encodeURIComponent(query.trim())}`)
        }
    }

    function handleSelect(t) {
        setOpen(false)
        setActive(-1)
        setQuery('')
        navigate(`/testimonial/${t.slug || t.id}`)
    }

    function formatDate(iso) {
        return iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    }

    return (
        <div className="search-wrapper" ref={wrapperRef}>
            <div className="search-bar">
                <Search size={18} className="search-icon" aria-hidden="true" />
                <input
                    type="search"
                    role="combobox"
                    aria-label="Search testimonials"
                    aria-autocomplete="list"
                    aria-expanded={listOpen}
                    aria-controls="search-suggest"
                    aria-activedescendant={listOpen && active >= 0 ? `search-opt-${active}` : undefined}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setActive(-1) }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder="Search by condition, product, or keyword…"
                    className="search-input"
                    autoComplete="off"
                />
                {query && (
                    <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQuery(''); setResults([]); setOpen(false); setActive(-1) }}>
                        <X size={16} aria-hidden="true" />
                    </button>
                )}
                <button type="button" className="search-btn" onClick={handleSearch}>Search</button>
            </div>

            {open && loading && (
                <div className="search-dropdown"><div className="search-dropdown-loading" role="status">Searching…</div></div>
            )}

            {listOpen && (
                <ul className="search-dropdown" id="search-suggest" role="listbox" aria-label="Suggested testimonials">
                    {results.map((t, i) => {
                        const tags = [
                            ...(t.conditions || []).map(v => ['c', v]),
                            ...(t.products || []).map(v => ['p', v]),
                        ]
                        return (
                            <li
                                key={t.id}
                                id={`search-opt-${i}`}
                                role="option"
                                aria-selected={active === i}
                                className={`search-opt ${active === i ? 'is-active' : ''}`}
                                onMouseDown={e => { e.preventDefault(); handleSelect(t) }}
                                onMouseEnter={() => setActive(i)}
                            >
                                <span className="t">{t.title}</span>
                                <span className="m">
                                    {[
                                        !hidesAuthor(nameDisplay) && (displayName(t, nameDisplay) || 'Anonymous'),
                                        showDates && t.created_at && formatDate(t.created_at),
                                    ].filter(Boolean).join(' · ')}
                                </span>
                                <span className="ex">{getExcerpt(t.story_text)}</span>
                                {tags.length > 0 && (
                                    <span className="tags">
                                        {tags.slice(0, 3).map(([k, v]) => (
                                            <span key={k + v} className={`tag tag-outline ${k === 'c' ? 'tag-condition' : 'tag-product'}`}>{v}</span>
                                        ))}
                                        {tags.length > 3 && <span className="more">+{tags.length - 3}</span>}
                                    </span>
                                )}
                            </li>
                        )
                    })}
                    <li
                        id={`search-opt-${results.length}`}
                        role="option"
                        aria-selected={active === results.length}
                        className={`search-all ${active === results.length ? 'is-active' : ''}`}
                        onMouseDown={e => { e.preventDefault(); handleSearch() }}
                        onMouseEnter={() => setActive(results.length)}
                    >
                        See all results for <strong>&ldquo;{query.trim()}&rdquo;</strong> <ArrowRight size={14} aria-hidden="true" />
                    </li>
                </ul>
            )}
        </div>
    )
}
