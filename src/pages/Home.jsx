import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import TestimonialCard from '../components/TestimonialCard'
import SearchBar from '../components/SearchBar'
import CategorySidebar from '../components/CategorySidebar'

const PRODUCTS = [
    'Ambrotose Complex', 'Advanced Ambrotose', 'Ambrotose AO',
    'NutriVerus', 'Catalyst', 'Manapol', 'PLUS', 'OsoLean',
    'GI-ProBalance', 'ImmunoSTART', 'BounceBack', 'Superfood Greens and Reds',
    'TruPLENISH', 'Cardio Balance', 'Omega 3'
]

export default function Home() {
    const [testimonials, setTestimonials] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState(null)

    useEffect(() => { fetchTestimonials() }, [])

    async function fetchTestimonials() {
        const { data, error } = await supabase
            .from('testimonials')
            .select('*')
            .eq('status', 'approved')
            .order('featured', { ascending: false })
            .order('created_at', { ascending: false })

        if (!error) setTestimonials(data)
        setLoading(false)
    }

    // Only the sidebar condition filter applies to the grid
    const filtered = activeFilter
        ? testimonials.filter(t =>
            t.conditions?.includes(activeFilter) ||
            t.products?.includes(activeFilter)
          )
        : testimonials

    const allConditions = [...new Set(testimonials.flatMap(t => t.conditions || []))]

    if (loading) return <div className="loading">Loading stories...</div>

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
                    <p className="no-results">No stories found for "{activeFilter}".</p>
                )}
            </div>
            <CategorySidebar
                conditions={allConditions}
                products={PRODUCTS}
                activeFilter={activeFilter}
                onFilter={setActiveFilter}
                testimonials={testimonials}
            />
        </div>
    )
}
