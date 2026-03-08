import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProducts, useConditions } from '../lib/ProductsContext'
import TestimonialCard from '../components/TestimonialCard'
import SearchBar from '../components/SearchBar'
import CategorySidebar from '../components/CategorySidebar'

export default function Home() {
    const PRODUCTS   = useProducts()
    const CONDITIONS = useConditions()
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchParams, setSearchParams] = useSearchParams()

    // Active filter comes from URL ?filter=X so navbar dropdowns can link here
    const activeFilter = searchParams.get('filter') || null

    useEffect(() => { fetchTestimonials() }, [])

    async function fetchTestimonials() {
        const { data, error } = await supabase
            .from('testimonials')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })

        if (!error) setTestimonials(data)
        setLoading(false)
    }

    function setActiveFilter(filter) {
        if (filter) {
            setSearchParams({ filter })
        } else {
            setSearchParams({})
        }
    }

    const filtered = activeFilter
        ? testimonials.filter(t =>
            t.conditions?.includes(activeFilter) ||
            t.products?.includes(activeFilter)
          )
        : testimonials



    if (loading) return <div className="loading">Loading testimonials...</div>

    return (
        <div className="home-layout">
            <div className="main-column">
                <SearchBar />
                <p className="results-count">
                    {activeFilter
                        ? `${filtered.length} stor${filtered.length === 1 ? 'y' : 'ies'} for "${activeFilter}"`
                        : `${filtered.length} stor${filtered.length === 1 ? 'y' : 'ies'}`
                    }
                </p>
                <div className="testimonials-grid">
                    {filtered.map(t => <TestimonialCard key={t.id} testimonial={t} />)}
                </div>
                {filtered.length === 0 && (
                    <p className="no-results">No testimonials found for "{activeFilter}".</p>
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
