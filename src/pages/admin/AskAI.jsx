import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useProducts, useConditions } from '../../lib/ProductsContext'
import { PDFDownloadButton } from '../../components/PDFDownloadButton'
import { Sparkles, AlertTriangle, ExternalLink } from 'lucide-react'

// ── Candidate gathering ────────────────────────────────────────────────────────
// Recall first: a testimonial is a *candidate* for a concept group if it matches
// the curated condition/product TAGS **or** a distinctive story-text KEYWORD.
// Keyword matching alone is far too noisy on this corpus (common words match
// everything), so keywords only widen the candidate net — Claude's relevance pass
// (netlify/functions/confirm-relevance) does the precision filtering afterwards.

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Pre-compile each group's tag sets + word-boundary keyword matchers once per search.
function compileGroups(groups) {
    return groups
        .map(g => ({
            label: g.label || '',
            conditions: g.conditions || [],
            products: g.products || [],
            keywords: g.keywords || [],
            condSet: new Set((g.conditions || []).map(c => c.toLowerCase())),
            prodSet: new Set((g.products || []).map(p => p.toLowerCase())),
            kwRes: (g.keywords || [])
                .filter(Boolean)
                .map(k => ({ word: k, re: new RegExp(`\\b${escapeRegExp(k.toLowerCase())}\\b`) })),
        }))
        // A group with no usable signal would make an AND search match nothing — drop it.
        .filter(g => g.condSet.size || g.prodSet.size || g.kwRes.length)
}

// How did a testimonial match a group? Returns { how, keywords } or null.
function matchGroup(t, g, hay) {
    const conds = (t.conditions || []).map(x => x.toLowerCase())
    const prods = (t.products || []).map(x => x.toLowerCase())
    if (conds.some(c => g.condSet.has(c)) || prods.some(p => g.prodSet.has(p))) {
        return { how: 'tag', keywords: [] }
    }
    const hits = g.kwRes.filter(k => k.re.test(hay)).map(k => k.word)
    if (hits.length) return { how: 'keyword', keywords: hits }
    return null
}

// Pull a focused evidence snippet for Claude: the story opening plus a window of
// context around each keyword hit (which may be buried deep in a long story).
function buildEvidence(story, keywords) {
    const s = story || ''
    const parts = [s.slice(0, 500)]
    const lower = s.toLowerCase()
    for (const k of keywords) {
        const idx = lower.indexOf(k.toLowerCase())
        if (idx > 500) {
            parts.push('…' + s.slice(Math.max(0, idx - 150), idx + k.length + 150) + '…')
        }
    }
    return parts.join(' ').slice(0, 1400)
}

const CHUNK = 8   // candidates per Claude relevance call (Netlify ~10s sync limit)

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
    const [phase, setPhase]     = useState('')
    const [error, setError]     = useState(null)
    const [result, setResult]   = useState(null)   // { interpretation, logic, matches: [{t, hits, reason}] }

    function clearSearch() {
        setQuery('')
        setResult(null)
        setError(null)
        setPhase('')
    }

    async function ask(q) {
        const question = (q ?? query).trim()
        if (!question || loading) return
        setLoading(true)
        setError(null)
        setResult(null)
        setPhase('Understanding your question…')

        try {
            // 1) Understand the query → structured intent (groups + keywords + logic)
            const resp = await fetch('/.netlify/functions/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: question, conditions: allConditions, products: allProducts }),
            })
            const intent = await resp.json()
            if (!resp.ok) throw new Error(intent.message || 'Search failed. Please try again.')

            const logic = intent.logic === 'AND' ? 'AND' : 'OR'
            const groups = compileGroups(intent.groups || [])
            if (groups.length === 0) {
                setResult({ interpretation: intent.interpretation || '', logic, matches: [] })
                setLoading(false)
                setPhase('')
                return
            }

            // 2) Fetch testimonials and gather candidates generously (tags OR keywords)
            setPhase('Searching testimonials…')
            const { data, error: fErr } = await supabase
                .from('testimonials')
                .select('id, title, person_name, anonymous, conditions, products, story_text, status, imported_from, slug, gallery_urls')
            if (fErr) throw new Error('Could not load testimonials: ' + fErr.message)

            const candidates = []
            for (const t of (data || [])) {
                const hay = `${t.title || ''} ${t.story_text || ''}`.toLowerCase()
                const perGroup = groups.map(g => ({ g, m: matchGroup(t, g, hay) }))
                // AND → every group must have some signal; OR → any group.
                const matchedGroups = perGroup.filter(x => x.m)
                const ok = logic === 'AND' ? matchedGroups.length === groups.length : matchedGroups.length > 0
                if (!ok) continue

                const hits = matchedGroups.map(x => ({ label: x.g.label, how: x.m.how, keywords: x.m.keywords }))
                const kwHits = [...new Set(matchedGroups.flatMap(x => x.m.keywords))]
                candidates.push({ t, hits, evidence: buildEvidence(t.story_text, kwHits) })
            }

            if (candidates.length === 0) {
                setResult({ interpretation: intent.interpretation || '', logic, matches: [] })
                setLoading(false)
                setPhase('')
                return
            }

            // 3) Relevance pass — Claude confirms genuine matches (precision), chunked.
            const byId = Object.fromEntries(candidates.map(c => [c.t.id, c]))
            const confirmed = new Map()   // id → reason
            for (let k = 0; k < candidates.length; k += CHUNK) {
                const chunk = candidates.slice(k, k + CHUNK)
                setPhase(`Checking relevance — ${Math.min(k + chunk.length, candidates.length)} of ${candidates.length}…`)
                const rResp = await fetch('/.netlify/functions/confirm-relevance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: question,
                        interpretation: intent.interpretation || '',
                        logic,
                        candidates: chunk.map(c => ({
                            id: c.t.id,
                            name: c.t.anonymous ? 'Anonymous' : (c.t.person_name || 'Unknown'),
                            conditions: c.t.conditions || [],
                            products: c.t.products || [],
                            text: c.evidence,
                        })),
                    }),
                })
                const rJson = await rResp.json()
                if (!rResp.ok) throw new Error(rJson.message || 'Relevance check failed.')
                for (const r of (rJson.relevant || [])) {
                    if (byId[r.id]) confirmed.set(r.id, r.reason || '')
                }
            }

            const matches = candidates
                .filter(c => confirmed.has(c.t.id))
                .map(c => ({ t: c.t, hits: c.hits, reason: confirmed.get(c.t.id) }))
                .sort((a, b) => b.hits.length - a.hits.length)

            setResult({ interpretation: intent.interpretation || '', logic, matches })
        } catch (err) {
            setError(err.message)
        }
        setLoading(false)
        setPhase('')
    }

    return (
        <div className="admin-page-content ask-ai-page">
            <h2><Sparkles size={20} /> Ask AI</h2>
            <p className="page-sub">
                Search testimonials in plain language. The AI maps your question to the right conditions and
                products, gathers every story that might fit, then confirms which ones genuinely match — so an
                empty result means nothing fits, not that the wording was off.
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
                {(result || query) && !loading && (
                    <button type="button" className="ask-ai-clear" onClick={clearSearch}>Clear</button>
                )}
            </form>

            {loading && phase && (
                <div className="ask-ai-phase"><span className="ask-ai-spinner" /> {phase}</div>
            )}

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

                    {result.matches.length === 0 ? (
                        <p className="table-empty">No testimonials genuinely matched that search.</p>
                    ) : (
                        <div className="ask-ai-list">
                            {result.matches.map(({ t, hits, reason }) => (
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
                                        {reason && (
                                            <p className="ask-ai-card-reason"><Sparkles size={12} /> {reason}</p>
                                        )}
                                        <p className="ask-ai-card-excerpt">
                                            {(t.story_text || '').slice(0, 220)}{t.story_text?.length > 220 ? '…' : ''}
                                        </p>
                                    </div>
                                    <div className="ask-ai-card-actions">
                                        <a href={`/testimonial/${t.slug || t.id}`} target="_blank" rel="noopener noreferrer">View <ExternalLink size={12} /></a>
                                        <Link to={`/admin/edit/${t.id}`}>Edit</Link>
                                        <PDFDownloadButton testimonial={t} variant="icon" className="ask-ai-pdf" />
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
