import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ScanSearch, AlertTriangle, CheckCircle } from 'lucide-react'

// ── Heuristic pre-filter ──────────────────────────────────────────────────────
// Finds candidate pairs before sending to Haiku for confirmation.
// Rules (any one match flags the pair):
//   1. Same non-anonymous person_name (case-insensitive)
//   2. Story text opens with the same 150 chars (whitespace-normalised)
//   3. Same first name + 2 or more overlapping conditions
function findCandidatePairs(testimonials) {
    const pairs = []
    const n = testimonials.length

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const a = testimonials[i]
            const b = testimonials[j]
            const reasons = []

            const nameA = (a.person_name || '').trim().toLowerCase()
            const nameB = (b.person_name || '').trim().toLowerCase()
            const condsA = new Set((a.conditions || []).map(c => c.toLowerCase()))
            const condsB = new Set((b.conditions || []).map(c => c.toLowerCase()))
            const overlap = [...condsA].filter(c => condsB.has(c)).length

            // Rule 1 — same full name (non-anonymous)
            if (!a.anonymous && !b.anonymous && nameA && nameB && nameA === nameB) {
                reasons.push('same name')
            }

            // Rule 2 — identical story opening (80 chars)
            const norm = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80)
            const openA = norm(a.story_text)
            const openB = norm(b.story_text)
            if (openA.length > 30 && openA === openB) {
                reasons.push('identical story opening')
            }

            // Rule 3 — same first name + any overlapping condition
            if (reasons.length === 0) {
                const firstA = nameA.split(' ')[0]
                const firstB = nameB.split(' ')[0]
                if (firstA && firstB && firstA === firstB && overlap >= 1) {
                    reasons.push(`same first name with ${overlap} shared condition${overlap > 1 ? 's' : ''}`)
                }
            }

            // Rule 4 — same conditions set (3+ conditions, full match)
            if (reasons.length === 0 && condsA.size >= 3 && condsA.size === condsB.size && overlap === condsA.size) {
                reasons.push('identical condition set')
            }

            if (reasons.length > 0) {
                pairs.push({
                    a:        { id: a.id, name: a.anonymous ? 'Anonymous' : (a.person_name || 'Unknown'), conditions: a.conditions, excerpt: (a.story_text || '').slice(0, 220) },
                    b:        { id: b.id, name: b.anonymous ? 'Anonymous' : (b.person_name || 'Unknown'), conditions: b.conditions, excerpt: (b.story_text || '').slice(0, 220) },
                    heuristic: reasons.join(', '),
                    // Keep full testimonial data for display
                    _a: a,
                    _b: b,
                })
            }
        }
    }

    return pairs
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Duplicates() {
    const [scanning, setScanning]         = useState(false)
    const [phase, setPhase]               = useState('')
    const [pairs, setPairs]               = useState(null)
    const [scannedCount, setScannedCount] = useState(0)
    const [candidateCount, setCandidateCount] = useState(0)
    const [error, setError]               = useState(null)

    async function runScan() {
        setScanning(true)
        setError(null)
        setPairs(null)
        setScannedCount(0)
        setCandidateCount(0)

        // Step 1 — fetch
        setPhase('Fetching testimonials…')
        const { data, error: fetchError } = await supabase
            .from('testimonials')
            .select('id, title, person_name, anonymous, conditions, story_text')
            .eq('status', 'approved')

        if (fetchError) {
            setError('Could not fetch testimonials: ' + fetchError.message)
            setScanning(false)
            return
        }

        setScannedCount(data.length)

        // Step 2 — heuristic pre-filter (client-side, no API cost)
        setPhase('Running heuristic checks…')
        const candidates = findCandidatePairs(data)
        setCandidateCount(candidates.length)

        if (candidates.length === 0) {
            setPairs([])
            setScanning(false)
            return
        }

        // Step 3 — send candidates to Haiku for confirmation
        setPhase(`Confirming ${candidates.length} suspect pair${candidates.length > 1 ? 's' : ''} with Claude Haiku…`)

        try {
            const resp = await fetch('/.netlify/functions/detect-duplicates', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ pairs: candidates }),
            })

            const result = await resp.json()

            if (!resp.ok) {
                throw new Error(result.message || 'Scan failed')
            }

            // Map confirmed ids back to full testimonial objects
            const idMap = Object.fromEntries(data.map(t => [t.id, t]))
            const confirmed = (result.confirmed || [])
                .map(c => ({
                    a:      idMap[c.a_id],
                    b:      idMap[c.b_id],
                    reason: c.reason,
                }))
                .filter(p => p.a && p.b)

            setPairs(confirmed)
        } catch (err) {
            setError(err.message)
        }

        setScanning(false)
        setPhase('')
    }

    return (
        <div className="admin-page-content">
            <h2>Duplicate Scanner</h2>
            <p className="page-sub">
                Finds likely duplicates using heuristics, then confirms with Claude Haiku.
            </p>

            <div className="dup-scan-bar">
                <button className="btn-dup-scan" onClick={runScan} disabled={scanning}>
                    <ScanSearch size={16} />
                    {scanning ? 'Scanning…' : 'Scan for Duplicates'}
                </button>

                {pairs !== null && !scanning && (
                    <span className={`dup-scan-summary ${pairs.length === 0 ? 'ok' : 'warn'}`}>
                        {pairs.length === 0
                            ? <><CheckCircle size={14} /> No duplicates found — {scannedCount} scanned, {candidateCount} candidates reviewed by Haiku</>
                            : <><AlertTriangle size={14} /> {pairs.length} confirmed duplicate{pairs.length > 1 ? 's' : ''} found in {scannedCount} testimonials</>
                        }
                    </span>
                )}
            </div>

            {error && (
                <div className="dup-error">
                    <AlertTriangle size={15} /> {error}
                </div>
            )}

            {scanning && (
                <div className="dup-scanning">
                    <span className="dup-spinner" />
                    {phase}
                </div>
            )}

            {pairs !== null && !scanning && pairs.length > 0 && (
                <div className="dup-pairs">
                    {pairs.map((pair, i) => (
                        <div key={i} className="dup-pair-card">
                            <div className="dup-pair-reason">
                                <AlertTriangle size={13} />
                                {pair.reason}
                            </div>
                            <div className="dup-pair-cols">
                                <DupCard t={pair.a} />
                                <DupCard t={pair.b} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function DupCard({ t }) {
    return (
        <div className="dup-card">
            <div className="dup-card-title">{t.title}</div>
            <div className="dup-card-author">
                {t.anonymous ? 'Anonymous' : t.person_name}
            </div>
            {(t.conditions || []).length > 0 && (
                <div className="dup-card-tags">
                    {t.conditions.map(c => (
                        <span key={c} className="dup-tag">{c}</span>
                    ))}
                </div>
            )}
            <p className="dup-card-excerpt">
                {(t.story_text || '').slice(0, 260)}{t.story_text?.length > 260 ? '…' : ''}
            </p>
            <Link to={`/admin/edit/${t.id}`} className="dup-card-edit">
                Open to edit / delete →
            </Link>
        </div>
    )
}
