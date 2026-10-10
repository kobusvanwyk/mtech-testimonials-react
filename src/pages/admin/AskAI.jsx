import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useProducts, useConditions } from '../../lib/ProductsContext'
import { Sparkles, AlertTriangle, ExternalLink } from 'lucide-react'

// Does a testimonial match a single concept group? Matches on the curated
// condition/product TAGS only. Free-text keyword matching was tried but is far
// too noisy on this corpus (common words like "leg"/"cleared" match everything),
// so we rely on the rich 185-condition taxonomy that the AI maps the query to.
function matchGroup(t, g) {
    const conds = new Set((t.conditions || []).map(x => x.toLowerCase()))
    const prods = new Set((t.products || []).map(x => x.toLowerCase()))
    if ((g.conditions || []).some(c => conds.has(c.toLowerCase()))) return 'tag'
    if ((g.products || []).some(p => prods.has(p.toLowerCase()))) return 'tag'
    return null
}

const EXAMPLES = [
    'Type 1 diabetes relating to foot conditions',
    'Children with autism who improved concentration',
    'Skin conditions cleared with Emprizone',
    'Cancer recovery stories mentioning Ambrotose',
]

export default function AskAI() {
    const allProducts   = useProducts()
    const allConditions = useConditions()

    const [query, setQuery]     = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState(null)
    const [result, setResult]   = useState(null)   // { interpretation, logic, groups, matches: [{t, groups:[labels]}] }

    async function ask(q) {
        const question = (q ?? query).trim()
        if (!question || loading) return
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            // 1) Understand the query → structured intent
            const resp = await fetch('/.netlify/functions/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: question, conditions: allConditions, products: allProducts }),
            })
            const intent = await resp.json()
            if (!resp.ok) throw new Error(intent.message || 'Search failed. Please try again.')

            const groups = intent.groups || []
            if (groups.length === 0) {
                setResult({ interpretation: intent.interpretation || '', logic: intent.logic, groups: [], matches: [] })
                setLoading(false)
                return
            }

            // 2) Fetch testimonials and filter by the intent
            const { data, error: fErr } = await supabase
                .from('testimonials')
                .select('id, title, person_name, anonymous, conditions, products, story_text, status, imported_from, slug')
            if (fErr) throw new Error('Could not load testimonials: ' + fErr.message)

            const filterBy = (logic) => {
                const out = []
                for (const t of (data || [])) {
                    const hits = groups.map(g => ({ label: g.label, how: matchGroup(t, g) }))
                    const ok = logic === 'AND' ? hits.every(h => h.how) : hits.some(h => h.how)
                    if (ok) {
                        const matchedHits = hits.filter(h => h.how)
                        out.push({ t, hits: matchedHits, tagHits: matchedHits.length })
                    }
                }
                out.sort((a, b) => b.hits.length - a.hits.length)
                return out
            }

            let matches = filterBy(intent.logic)
            let broadened = false
            // If a strict "all criteria" search finds nothing, broaden to "any criteria"
            // so outcome-phrased questions don't dead-end.
            if (intent.logic === 'AND' && matches.length === 0 && groups.length > 1) {
                matches = filterBy('OR')
                broadened = true
            }

            setResult({ interpretation: intent.interpretation || '', logic: intent.logic, groups, matches, broadened })
        } catch (err) {
            setError(err.message)
        }
        setLoading(false)
    }

    return (
        <div className="admin-page-content ask-ai-page">
            <h2><Sparkles size={20} /> Ask AI</h2>
            <p className="page-sub">
                Search testimonials in plain language. The AI maps your question to the right conditions and
                products, then finds the matching stories. For "X relating to Y" it requires both.
            </p>

            <form className="ask-ai-form" onSubmit={e => { e.preventDefault(); ask() }}>
                <input
                    className="ask-ai-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="e.g. Type 1 diabetes relating to foot conditions"
                    autoFocus
                />
                <button className="ask-ai-btn" type="submit" disabled={loading || !query.trim()}>
                    {loading ? <><span className="ask-ai-spinner" /> Searching…</> : <><Sparkles size={15} /> Ask</>}
                </button>
            </form>

            {!result && !loading && !error && (
                <div className="ask-ai-examples">
                    <span>Try:</span>
                    {EXAMPLES.map(ex => (
                        <button key={ex} className="ask-ai-chip" onClick={() => { setQuery(ex); ask(ex) }}>{ex}</button>
                    ))}
                </div>
            )}

            {error && <div className="dup-error"><AlertTriangle size={15} /> {error}</div>}

            {result && !loading && (
                <div className="ask-ai-results">
                    {result.interpretation && (
                        <div className="ask-ai-interpretation">
                            <Sparkles size={14} />
                            <span>{result.interpretation}</span>
                            <span className="ask-ai-count">
                                {result.matches.length} result{result.matches.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )}

                    {result.broadened && result.matches.length > 0 && (
                        <div className="ask-ai-broadened">
                            No testimonials matched <em>all</em> criteria — showing stories matching <em>any</em> of them.
                        </div>
                    )}

                    {result.matches.length === 0 ? (
                        <p className="table-empty">No testimonials matched that search.</p>
                    ) : (
                        <div className="ask-ai-list">
                            {result.matches.map(({ t, hits }) => (
                                <div key={t.id} className="ask-ai-card">
                                    <div className="ask-ai-card-main">
                                        <div className="ask-ai-card-title">{t.title}</div>
                                        <div className="ask-ai-card-author">
                                            {t.anonymous ? 'Anonymous' : t.person_name}
                                            {t.status !== 'approved' && <span className="ask-ai-status"> · {t.status}</span>}
                                        </div>
                                        <div className="ask-ai-card-hits">
                                            {hits.map((h, i) => (
                                                <span key={i} className={`ask-ai-hit ask-ai-hit--${h.how}`}>{h.label}</span>
                                            ))}
                                        </div>
                                        <p className="ask-ai-card-excerpt">
                                            {(t.story_text || '').slice(0, 220)}{t.story_text?.length > 220 ? '…' : ''}
                                        </p>
                                    </div>
                                    <div className="ask-ai-card-actions">
                                        <a href={`/testimonial/${t.slug || t.id}`} target="_blank" rel="noopener noreferrer">View <ExternalLink size={12} /></a>
                                        <Link to={`/admin/edit/${t.id}`}>Edit</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
