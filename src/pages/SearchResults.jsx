import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TestimonialCard from '../components/TestimonialCard'
import { TestimonialGridSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ResultsControls from '../components/ResultsControls'
import SortSheet from '../components/SortSheet'
import { readResultsParams, writeResultsParams } from '../lib/resultsParams'
import { useSiteSettings } from '../lib/SiteSettingsContext'
import { ArrowLeft, Search, SearchX, X } from 'lucide-react'

// Sorting and the photo switch run in the browser here, because the results
// are merged from a text match and a tag match.
const noun = n => (n === 1 ? 'testimonial' : 'testimonials')

export default function SearchResults() {
    const [searchParams, setSearchParams] = useSearchParams()
    const { nameDisplay } = useSiteSettings()
    const query = searchParams.get('q') || ''
    const { sort, photos } = readResultsParams(searchParams)
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(true)
    const [inputValue, setInputValue] = useState(query)

    useEffect(() => {
        setInputValue(query)
        if (query.trim()) {
            runSearch(query)
        } else {
            setResults([])
            setLoading(false)
        }
    }, [query, nameDisplay])

    async function runSearch(q) {
        setLoading(true)
        const term = q.toLowerCase()

        const { data: textMatches } = await supabase
            .from('testimonials')
            .select('*')
            .eq('status', 'approved')
            // Names only count as a match when the site shows them in full
            .or(nameDisplay === 'full'
                ? `title.ilike.%${term}%,person_name.ilike.%${term}%,story_text.ilike.%${term}%`
                : `title.ilike.%${term}%,story_text.ilike.%${term}%`)

        const { data: allApproved } = await supabase
            .from('testimonials')
            .select('*')
            .eq('status', 'approved')

        const tagMatches = (allApproved || []).filter(t =>
            t.conditions?.some(c => c.toLowerCase().includes(term)) ||
            t.products?.some(p => p.toLowerCase().includes(term))
        )

        const seen = new Set()
        const merged = [...(textMatches || []), ...tagMatches].filter(t => {
            if (seen.has(t.id)) return false
            seen.add(t.id)
            return true
        })

        setResults(merged)
        setLoading(false)
    }

    function handleSearch(e) {
        e.preventDefault()
        if (inputValue.trim()) {
            setParams({ q: inputValue.trim() })
        }
    }

    // Query and sort live in the URL so a results view can be shared
    function setParams(next) {
        const p = { q: query, sort, photos, ...next }
        const out = {}
        if (p.q) out.q = p.q
        setSearchParams(writeResultsParams(out, p))
    }

    const byDate = (a, b) => new Date(b.created_at) - new Date(a.created_at)
    const shown = (photos ? results.filter(t => t.gallery_urls?.length > 0) : [...results])
        .sort(sort === 'oldest' ? (a, b) => byDate(b, a) : byDate)

    return (
        <div className="home-layout search-results-page">
            <header className="home-intro search-intro">
                <h1>Search testimonials</h1>
                <p className="home-intro-sub">Search by condition, product, name or any word in a testimonial.</p>
            </header>

            <form className="search-results-form" onSubmit={handleSearch} role="search">
                <Search size={18} className="search-icon" aria-hidden="true" />
                <input
                    type="search"
                    aria-label="Search testimonials"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Search by condition, product, or keyword…"
                    className="search-input"
                    autoComplete="off"
                />
                {inputValue && (
                    <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setInputValue('')}>
                        <X size={16} aria-hidden="true" />
                    </button>
                )}
                <button type="submit" className="search-btn">Search</button>
            </form>

            {/* The search term is what the page is about: same band as a Home filter */}
            {query && (
                <section className="home-filter" aria-labelledby="search-term-h">
                    <div className="home-filter-text">
                        <p className="home-filter-kind">Search</p>
                        <h2 id="search-term-h"><span className="home-filter-lead">Testimonials matching </span>"{query}"</h2>
                        {!loading && results.length > 0 && (
                            <span className="home-filter-count">
                                {photos ? `${shown.length} of ${results.length} with photos` : `${results.length} found`}
                            </span>
                        )}
                    </div>
                    {!loading && results.length > 0 && (
                        <SortSheet iconOnly sort={sort} photos={photos} onChange={setParams} className="band-sort" />
                    )}
                    <Link to="/" className="btn-secondary home-filter-clear" aria-label="Show all testimonials">
                        <X size={16} aria-hidden="true" /><span className="home-filter-clear-txt">Show all testimonials</span>
                    </Link>
                </section>
            )}

            {loading ? (
                <TestimonialGridSkeleton count={6} />
            ) : results.length === 0 ? (
                query ? (
                    <EmptyState
                        icon={SearchX}
                        title="No matching testimonials"
                        action={<Link to="/" className="btn-primary"><ArrowLeft size={16} aria-hidden="true" /> Browse all testimonials</Link>}
                    >
                        Nothing matched "{query}". Check the spelling, or try a shorter word such as a product or condition name.
                    </EmptyState>
                ) : (
                    <EmptyState icon={Search} title="What are you looking for?">
                        Type a condition, product or keyword above to find matching testimonials.
                    </EmptyState>
                )
            ) : (
                <>
                    <div className="home-toolbar">
                        <p className="results-count" aria-live="polite">
                            {/* No paging here, so state the result, not "Showing x of y" */}
                            {photos
                                ? <><strong>{shown.length}</strong> of <strong>{results.length}</strong> {noun(results.length)} {shown.length === 1 ? 'has' : 'have'} photos</>
                                : <><strong>{results.length}</strong> {noun(results.length)} found</>}
                        </p>
                        <ResultsControls sort={sort} photos={photos} onChange={setParams} />
                    </div>

                    {shown.length === 0 ? (
                        <EmptyState
                            icon={SearchX}
                            title="None of these have photos"
                            action={<button type="button" className="btn-secondary" onClick={() => setParams({ photos: false })}>Show all {results.length} {noun(results.length)}</button>}
                        >
                            The testimonials matching "{query}" have no photos attached.
                        </EmptyState>
                    ) : (
                        <div className="testimonials-grid">
                            {shown.map(t => <TestimonialCard key={t.id} testimonial={t} />)}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
