import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ScanSearch, AlertTriangle, CheckCircle, ExternalLink, Image as ImageIcon } from 'lucide-react'

// ── Text similarity (TF-IDF cosine) ───────────────────────────────────────────
// Down-weights ubiquitous domain words (mannatech, product, health…) so that
// distinctive tokens — names, numbers, places, specific conditions — dominate.
// This catches reworded / translated / first-vs-third-person retellings that
// share little literal text but lots of distinctive vocabulary.
const STOP = new Set((
    'a about after all also am an and are as at be been before being but by can could did do does for from ' +
    'had has have he her him his how i if in into is it its just me more most my no not of on only or our out ' +
    'over she so some such than that the their them then there these they this to too under up us very was we ' +
    'were what when where which who will with would you your yours it\'s i\'m i\'ve'
).split(/\s+/))

function tokenize(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9%]+/g, ' ')
        .split(' ')
        .filter(w => w.length >= 2 && !STOP.has(w))
}

function buildVectors(items) {
    const N = items.length
    const docs = items.map(t => {
        const tf = new Map()
        for (const w of tokenize(`${t.title || ''} ${t.story_text || ''}`)) {
            tf.set(w, (tf.get(w) || 0) + 1)
        }
        return { tf }
    })
    const df = new Map()
    docs.forEach(d => { for (const w of d.tf.keys()) df.set(w, (df.get(w) || 0) + 1) })
    docs.forEach(d => {
        d.vec = new Map()
        let sq = 0
        for (const [w, c] of d.tf) {
            const idf = Math.log(N / (df.get(w) || 1))
            const wt = c * idf
            if (wt > 0) { d.vec.set(w, wt); sq += wt * wt }
        }
        d.norm = Math.sqrt(sq) || 1
    })
    return docs
}

function cosine(docs, i, j) {
    const A = docs[i].vec, B = docs[j].vec
    const [small, large] = A.size < B.size ? [A, B] : [B, A]
    let dot = 0
    for (const [w, wa] of small) { const wb = large.get(w); if (wb) dot += wa * wb }
    return dot / (docs[i].norm * docs[j].norm)
}

// ── Candidate pre-filter ──────────────────────────────────────────────────────
const TEXT_THRESHOLD = 0.30   // sensitive
const MAX_CANDIDATES = 160    // cap sent to Claude

function findCandidatePairs(items) {
    const N = items.length
    const docs = buildVectors(items)

    // Map shared gallery images → pairs
    const imageOwners = new Map()
    items.forEach((t, idx) => (t.gallery_urls || []).forEach(u => {
        const key = (u || '').trim()
        if (!key) return
        if (!imageOwners.has(key)) imageOwners.set(key, [])
        imageOwners.get(key).push(idx)
    }))
    const sharedImage = new Set()
    for (const ids of imageOwners.values()) {
        if (ids.length > 1) {
            for (let x = 0; x < ids.length; x++)
                for (let y = x + 1; y < ids.length; y++)
                    sharedImage.add(`${Math.min(ids[x], ids[y])}-${Math.max(ids[x], ids[y])}`)
        }
    }

    const pairs = []
    for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
            const a = items[i], b = items[j]
            const reasons = []
            let score = 0
            let imageMatch = false

            if (sharedImage.has(`${i}-${j}`)) {
                reasons.push('same image')
                imageMatch = true
                score = Math.max(score, 0.98)
            }

            const sim = cosine(docs, i, j)
            if (sim >= TEXT_THRESHOLD) {
                reasons.push(`similar text (${Math.round(sim * 100)}%)`)
                score = Math.max(score, sim)
            }

            // Same name is only a *booster* on a pair that's already similar — on
            // its own it's noisy here (many testimonials share a common name but
            // tell different stories), and would otherwise swamp the candidate cap.
            if (reasons.length > 0 && !a.anonymous && !b.anonymous) {
                const nameA = (a.person_name || '').trim().toLowerCase()
                const nameB = (b.person_name || '').trim().toLowerCase()
                if (nameA && nameA === nameB) {
                    reasons.push('same name')
                    score = Math.min(1, score + 0.05)
                }
            }

            if (reasons.length > 0) {
                pairs.push({ i, j, reasons, score, sim, imageMatch })
            }
        }
    }

    pairs.sort((p, q) => q.score - p.score)
    return { pairs: pairs.slice(0, MAX_CANDIDATES), total: pairs.length }
}

const CHUNK = 8

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Duplicates() {
    const [scanning, setScanning] = useState(false)
    const [phase, setPhase]       = useState('')
    const [pairs, setPairs]       = useState(null)
    const [stats, setStats]       = useState({ scanned: 0, candidates: 0, capped: false })
    const [error, setError]       = useState(null)

    async function runScan() {
        setScanning(true)
        setError(null)
        setPairs(null)
        setStats({ scanned: 0, candidates: 0, capped: false })

        setPhase('Fetching all testimonials…')
        const { data, error: fetchError } = await supabase
            .from('testimonials')
            .select('id, title, person_name, anonymous, conditions, products, story_text, gallery_urls, status, imported_from')

        if (fetchError) {
            setError('Could not fetch testimonials: ' + fetchError.message)
            setScanning(false)
            return
        }

        setPhase('Scoring similarity (image + text)…')
        // let the spinner paint before the (brief) synchronous work
        await new Promise(r => setTimeout(r, 30))
        const { pairs: candidates, total } = findCandidatePairs(data)
        setStats({ scanned: data.length, candidates: total, capped: total > candidates.length })

        if (candidates.length === 0) {
            setPairs([])
            setScanning(false)
            setPhase('')
            return
        }

        // Build payload + a lookup for merging Claude's verdict back with our scores
        const idMap = Object.fromEntries(data.map(t => [t.id, t]))
        const candById = {}
        const payloads = candidates.map(c => {
            const a = data[c.i], b = data[c.j]
            candById[`${a.id}|${b.id}`] = c
            return {
                a: { id: a.id, name: a.anonymous ? 'Anonymous' : (a.person_name || 'Unknown'), conditions: a.conditions, excerpt: (a.story_text || '').slice(0, 400) },
                b: { id: b.id, name: b.anonymous ? 'Anonymous' : (b.person_name || 'Unknown'), conditions: b.conditions, excerpt: (b.story_text || '').slice(0, 400) },
                heuristic: c.reasons.join(', '),
                imageMatch: c.imageMatch,
            }
        })

        try {
            const confirmed = []
            for (let k = 0; k < payloads.length; k += CHUNK) {
                const chunk = payloads.slice(k, k + CHUNK)
                setPhase(`Confirming ${Math.min(k + chunk.length, payloads.length)} of ${payloads.length} candidate pairs with Claude…`)
                const resp = await fetch('/.netlify/functions/detect-duplicates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pairs: chunk }),
                })
                const result = await resp.json()
                if (!resp.ok) throw new Error(result.message || 'Scan failed')
                confirmed.push(...(result.confirmed || []))
            }

            const merged = confirmed
                .map(c => {
                    const cand = candById[`${c.a_id}|${c.b_id}`] || candById[`${c.b_id}|${c.a_id}`]
                    return {
                        a: idMap[c.a_id],
                        b: idMap[c.b_id],
                        reason: c.reason,
                        score: cand?.score ?? 0,
                        sim: cand?.sim ?? 0,
                        imageMatch: cand?.imageMatch ?? false,
                        signals: cand?.reasons ?? [],
                    }
                })
                .filter(p => p.a && p.b)
                .sort((p, q) => q.score - p.score)

            setPairs(merged)
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
                Scans <strong>all</strong> testimonials for duplicates using shared images and TF-IDF text
                similarity, then confirms suspects with Claude. Tuned to be sensitive — review before deleting.
                Nothing is changed automatically.
            </p>

            <div className="dup-scan-bar">
                <button className="btn-dup-scan" onClick={runScan} disabled={scanning}>
                    <ScanSearch size={16} />
                    {scanning ? 'Scanning…' : 'Scan for Duplicates'}
                </button>

                {pairs !== null && !scanning && (
                    <span className={`dup-scan-summary ${pairs.length === 0 ? 'ok' : 'warn'}`}>
                        {pairs.length === 0
                            ? <><CheckCircle size={14} /> No duplicates confirmed — {stats.scanned} scanned, {stats.candidates} candidate pairs reviewed</>
                            : <><AlertTriangle size={14} /> {pairs.length} likely duplicate{pairs.length > 1 ? 's' : ''} across {stats.scanned} testimonials</>
                        }
                    </span>
                )}
            </div>

            {stats.capped && pairs !== null && !scanning && (
                <div className="dup-note">
                    Showing the top {MAX_CANDIDATES} candidate pairs by similarity (of {stats.candidates}).
                    Re-run after cleaning these up to catch the rest.
                </div>
            )}

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
                                {pair.imageMatch
                                    ? <ImageIcon size={13} />
                                    : <AlertTriangle size={13} />}
                                {pair.reason}
                                <span className="dup-pair-score">
                                    {pair.imageMatch && 'same image · '}
                                    {Math.round((pair.sim || 0) * 100)}% text match
                                </span>
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

function sourceLabel(from) {
    const f = (from || '').toLowerCase()
    if (f.startsWith('whatsapp')) return 'WhatsApp'
    if (f.includes('telegram'))  return 'Telegram'
    if (f.endsWith('.csv'))      return 'CSV'
    if (f === 'manual_import')   return 'Manual'
    return null
}

function DupCard({ t }) {
    const src = sourceLabel(t.imported_from)
    return (
        <div className="dup-card">
            <div className="dup-card-head">
                <span className={`dup-card-status status-${t.status}`}>{t.status === 'approved' ? 'Published' : t.status}</span>
                {src && <span className="dup-card-src">{src}</span>}
                {(t.gallery_urls || []).length > 0 && (
                    <span className="dup-card-imgs"><ImageIcon size={11} /> {t.gallery_urls.length}</span>
                )}
            </div>
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
            <a
                href={`/admin/edit/${t.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="dup-card-edit"
            >
                Open to edit / delete <ExternalLink size={12} />
            </a>
        </div>
    )
}
