import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TestimonialCard from '../components/TestimonialCard'
import { ArrowLeft } from 'lucide-react'

export default function SearchResults() {
    const [searchParams, setSearchParams] = useSearchParams()
    const query = searchParams.get('q') || ''
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
    }, [query])

    async function runSearch(q) {
        setLoading(true)
        const term = q.toLowerCase()

        const { data: textMatches } = await supabase
            .from('testimonials')
            .select('*')
            .eq('status', 'approved')
            .or(`title.ilike.%${term}%,person_name.ilike.%${term}%,story_text.ilike.%${term}%`)

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
            setSearchParams({ q: inputValue.trim() })
        }
    }

    return (
        <div className="search-results-page">
            <div className="search-results-header">
                <h1>Search Results</h1>
                <form className="search-results-form" onSubmit={handleSearch}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder="Search by condition, product, or keyword..."
                        className="search-input"
                        autoComplete="off"
                    />
                    <button type="submit" className="search-btn">Search</button>
                </form>
            </div>

            {loading ? (
                <div className="loading">Searching…</div>
            ) : (
                <>
                    <p className="results-count">
                        {results.length} result{results.length !== 1 ? 's' : ''} for "<strong>{query}</strong>"
                    </p>

                    {results.length === 0 ? (
                        <div className="no-results">
                            <p>No testimonials found matching "<strong>{query}</strong>".</p>
                            <Link to="/" className="btn-primary">
                                <ArrowLeft size={15} /> Browse all testimonials
                            </Link>
                        </div>
                    ) : (
                        <div className="testimonials-grid">
                            {results.map(t => <TestimonialCard key={t.id} testimonial={t} />)}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
