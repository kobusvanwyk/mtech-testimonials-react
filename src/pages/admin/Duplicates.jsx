import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ScanSearch, AlertTriangle, CheckCircle } from 'lucide-react'

export default function Duplicates() {
    const [scanning, setScanning]   = useState(false)
    const [pairs, setPairs]         = useState(null)
    const [scannedCount, setScannedCount] = useState(0)
    const [error, setError]         = useState(null)

    async function runScan() {
        setScanning(true)
        setError(null)
        setPairs(null)
        setScannedCount(0)

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

        const condensed = data.map(t => ({
            id:         t.id,
            name:       t.anonymous ? 'Anonymous' : (t.person_name || 'Unknown'),
            conditions: t.conditions || [],
            excerpt:    (t.story_text || '').slice(0, 220),
        }))

        try {
            const resp = await fetch('/.netlify/functions/detect-duplicates', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ testimonials: condensed }),
            })

            const result = await resp.json()

            if (!resp.ok) {
                throw new Error(result.message || 'Scan failed')
            }

            const resolved = (result.pairs || [])
                .map(pair => ({
                    a:      data[pair.a],
                    b:      data[pair.b],
                    reason: pair.reason,
                }))
                .filter(p => p.a && p.b)

            setPairs(resolved)
        } catch (err) {
            setError(err.message)
        }

        setScanning(false)
    }

    return (
        <div className="admin-page-content">
            <h2>Duplicate Scanner</h2>
            <p className="page-sub">
                Scan all published testimonials for likely duplicates using Claude Haiku.
            </p>

            <div className="dup-scan-bar">
                <button className="btn-dup-scan" onClick={runScan} disabled={scanning}>
                    <ScanSearch size={16} />
                    {scanning ? 'Scanning…' : 'Scan for Duplicates'}
                </button>

                {pairs !== null && !scanning && (
                    <span className={`dup-scan-summary ${pairs.length === 0 ? 'ok' : 'warn'}`}>
                        {pairs.length === 0
                            ? <><CheckCircle size={14} /> No duplicates found across {scannedCount} testimonials</>
                            : <><AlertTriangle size={14} /> {pairs.length} suspected pair{pairs.length > 1 ? 's' : ''} found in {scannedCount} testimonials</>
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
                    Analysing {scannedCount > 0 ? scannedCount : '…'} testimonials with Claude Haiku…
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
