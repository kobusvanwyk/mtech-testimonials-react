import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProducts, useConditions } from '../lib/ProductsContext'
import TestimonialCard from '../components/TestimonialCard'
import SearchBar from '../components/SearchBar'
import CategorySidebar from '../components/CategorySidebar'

const PAGE_SIZE = 12

export default function Home() {
    const PRODUCTS   = useProducts()
    const CONDITIONS = useConditions()
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [totalCount, setTotalCount] = useState(0)
    const [searchParams, setSearchParams] = useSearchParams()

    const activeFilter = searchParams.get('filter') || null

    // Reset and re-fetch when filter changes
    useEffect(() => {
        setTestimonials([])
        setLoading(true)
        fetchTestimonials(0, true)
    }, [activeFilter])

    async function fetchTestimonials(from = 0, reset = false) {
        const to = from + PAGE_SIZE - 1

        let query = supabase
            .from('testimonials')
            .select('*', { count: 'exact' })
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .range(from, to)

        if (activeFilter) {
            query = query.or(
                `conditions.cs.{"${activeFilter}"},products.cs.{"${activeFilter}"}`
            )
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

    function setActiveFilter(filter) {
        if (filter) setSearchParams({ filter })
        else setSearchParams({})
    }

    if (loading) return <div className="loading">Loading testimonials...</div>

    return (
        <div className="home-layout">
            <div className="main-column">
                <SearchBar />
                <p className="results-count">
                    {activeFilter
                        ? `${totalCount} testimonial${totalCount === 1 ? '' : 's'} for "${activeFilter}"`
                        : `${totalCount} testimonial${totalCount === 1 ? '' : 's'}`
                    }
                </p>
                <div className="testimonials-grid">
                    {testimonials.map(t => <TestimonialCard key={t.id} testimonial={t} />)}
                </div>
                {testimonials.length === 0 && !loading && (
                    <p className="no-results">No testimonials found for "{activeFilter}".</p>
                )}
                {hasMore && (
                    <div className="load-more-wrap">
                        <button
                            className="btn-load-more"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? 'Loading...' : `Load more testimonials`}
                        </button>
                    </div>
                )}
            </div>
            <CategorySidebar
                conditions={CONDITIONS}
                products={PRODUCTS}
                activeFilter={activeFilter}
                onFilter={setActiveFilter}
                testimonials={testimonials}
            />
        </div>
    )
}
