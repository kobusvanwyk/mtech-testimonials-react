import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTagCounts } from '../lib/useTagCounts'
import { useProducts } from '../lib/ProductsContext'
import TestimonialCard from '../components/TestimonialCard'
import { TestimonialGridSkeleton } from '../components/Skeleton'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/EmptyState'
import ResultsControls from '../components/ResultsControls'
import SortSheet from '../components/SortSheet'
import { readResultsParams, writeResultsParams } from '../lib/resultsParams'
import { SearchX, X } from 'lucide-react'

const PAGE_SIZE = 12

export default function Home() {
    const { total, ready } = useTagCounts()
    const PRODUCTS = useProducts()
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [totalCount, setTotalCount] = useState(0)
    const [searchParams, setSearchParams] = useSearchParams()

    const activeFilter = searchParams.get('filter') || null
    const { sort, photos } = readResultsParams(searchParams)

    // Reset and re-fetch when the filter, sort or photo switch changes
    useEffect(() => {
        setTestimonials([])
        setLoading(true)
        fetchTestimonials(0, true)
    }, [activeFilter, sort, photos])

    async function fetchTestimonials(from = 0, reset = false) {
        const to = from + PAGE_SIZE - 1

        let query = supabase
            .from('testimonials')
            .select('*', { count: 'exact' })
            .eq('status', 'approved')
            .order('created_at', { ascending: sort === 'oldest' })
            .range(from, to)

        if (activeFilter) {
            query = query.or(
                `conditions.cs.{"${activeFilter}"},products.cs.{"${activeFilter}"}`
            )
        }
        if (photos) {
            query = query.not('gallery_urls', 'is', null).neq('gallery_urls', '{}')
        }

        const { data, error, count } = await query

        if (!error && data) {
            setTestimonials(prev => reset ? data : [...prev, ...data])
            setTotalCount(count ?? 0)
            setHasMore(from + PAGE_SIZE < (count ?? 0))
        }
        reset ? setLoading(false) : setLoadingMore(false)
    }

    async function handleLoadMore() {
        setLoadingMore(true)
        await fetchTestimonials(testimonials.length)
    }

    // Filter and sort live in the URL so a filtered view can be shared
    function setParams(next) {
        const p = { filter: activeFilter, sort, photos, ...next }
        const out = {}
        if (p.filter) out.filter = p.filter
        setSearchParams(writeResultsParams(out, p))
    }
    const setActiveFilter = filter => setParams({ filter })

    const noun = n => `${n === 1 ? 'testimonial' : 'testimonials'}`

    return (
        <div className="home-layout">
            <header className="home-intro">
                <h1>Mannatech testimonials from South Africa</h1>
                <p className="home-intro-sub">
                    {ready
                        ? <><strong>{total}</strong> {noun(total)}<span className="home-intro-more"> shared by people using Mannatech products</span>.</>
                        : 'Testimonials shared by people using Mannatech products.'}
                </p>
            </header>

            <SearchBar />

            {/* An active filter is what the page is about: a subheading, not a chip */}
            {activeFilter && (
                <section className="home-filter" aria-labelledby="home-filter-h">
                    <div className="home-filter-text">
                        <p className="home-filter-kind">{PRODUCTS.includes(activeFilter) ? 'Product' : 'Condition'}</p>
                        <h2 id="home-filter-h"><span className="home-filter-lead">Testimonials about </span>{activeFilter}</h2>
                        {!loading && <span className="home-filter-count">{totalCount} found</span>}
                    </div>
                    <SortSheet iconOnly sort={sort} photos={photos} onChange={setParams} className="band-sort" />
                    <button type="button" className="btn-secondary home-filter-clear" onClick={() => setActiveFilter(null)} aria-label="Show all testimonials">
                        <X size={16} aria-hidden="true" /><span className="home-filter-clear-txt">Show all testimonials</span>
                    </button>
                </section>
            )}

            <div className="home-toolbar">
                <p className="results-count" aria-live="polite">
                    {loading ? ' ' : (
                        <>Showing <strong>{testimonials.length}</strong> of <strong>{totalCount}</strong> {noun(totalCount)}</>
                    )}
                </p>
                <ResultsControls sort={sort} photos={photos} onChange={setParams} />
            </div>

            {loading ? (
                <TestimonialGridSkeleton count={6} />
            ) : (
                <div className="testimonials-grid">
                    {testimonials.map(t => <TestimonialCard key={t.id} testimonial={t} />)}
                </div>
            )}
            {testimonials.length === 0 && !loading && (
                activeFilter || photos ? (
                    <EmptyState
                        icon={SearchX}
                        title={activeFilter ? `No testimonials for "${activeFilter}" yet` : 'No testimonials with photos yet'}
                        action={<button type="button" className="btn-secondary" onClick={() => setParams({ filter: null, sort: 'newest', photos: false })}>Show all testimonials</button>}
                    >
                        Nothing matches this view. Try another product or condition, or browse them all.
                    </EmptyState>
                ) : (
                    <EmptyState
                        icon={SearchX}
                        title="No testimonials published yet"
                        action={<Link to="/submit" className="btn-primary">Share your testimonial</Link>}
                    >
                        Testimonials appear here once they are reviewed. Be the first to share yours.
                    </EmptyState>
                )
            )}
            {hasMore && (
                <div className="load-more-wrap">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? 'Loading…' : 'Load more testimonials'}
                    </button>
                </div>
            )}
        </div>
    )
}
