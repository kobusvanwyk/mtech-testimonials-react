import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import TestimonialCard from '../components/TestimonialCard'
import SearchBar from '../components/SearchBar'
import CategorySidebar from '../components/CategorySidebar'

// List of your Mannatech products (edit as needed)
const PRODUCTS = [
    'Ambrotose Complex', 'Advanced Ambrotose', 'Ambrotose AO',
    'NutriVerus', 'Catalyst', 'Manapol', 'PLUS', 'OsoLean',
    'GI-ProBalance', 'ImmunoSTART', 'BounceBack', 'Superfood Greens and Reds',
    'TruPLENISH', 'Cardio Balance', 'Omega 3'
]

export default function Home() {
    const [testimonials, setTestimonials] = useState([])
    const [filtered, setFiltered] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchTestimonials()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [testimonials, activeFilter, searchQuery])

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

    function applyFilters() {
        let results = [...testimonials]

        if (activeFilter) {
            results = results.filter(t =>
                t.conditions?.includes(activeFilter) ||
                t.products?.includes(activeFilter)
            )
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            results = results.filter(t =>
                t.title?.toLowerCase().includes(q) ||
                t.story_text?.toLowerCase().includes(q) ||
                t.person_name?.toLowerCase().includes(q) ||
                t.conditions?.some(c => c.toLowerCase().includes(q)) ||
                t.products?.some(p => p.toLowerCase().includes(q))
            )
        }

        setFiltered(results)
    }

    // Collect all unique conditions from testimonials
    const allConditions = [...new Set(testimonials.flatMap(t => t.conditions || []))]

    if (loading) return <div className="loading">Loading stories...</div>

    return (
        <div className="home-layout">
            <div className="main-column">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
                <p className="results-count">{filtered.length} stor{filtered.length === 1 ? 'y' : 'ies'}</p>
                <div className="testimonials-grid">
                    {filtered.map(t => <TestimonialCard key={t.id} testimonial={t} />)}
                </div>
                {filtered.length === 0 && (
                    <p className="no-results">No stories found. Try a different search.</p>
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