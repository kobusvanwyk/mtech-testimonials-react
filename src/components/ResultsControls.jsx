import { useId } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { SORTS } from '../lib/resultsParams'
import SortSheet from './SortSheet'

// Right-hand side of the results toolbar on Home and Search.
// Sort only orders (it never hides anything); "With photos only" is a separate
// on/off filter. Reset shows only when either is off its default.
// Phones get one "Sort & filter" button and a bottom sheet instead.

export default function ResultsControls({ sort, photos, onChange }) {
    const sortId = useId()
    const changed = sort !== 'newest' || photos

    return (
        <>
        <SortSheet sort={sort} photos={photos} onChange={onChange} className="rc-mobile" />
        <div className="home-sort">
            {changed && (
                <button type="button" className="home-reset" onClick={() => onChange({ sort: 'newest', photos: false })} aria-label="Reset to newest first, all testimonials">
                    <RotateCcw size={16} aria-hidden="true" /> Reset
                </button>
            )}
            <button
                type="button"
                className="photo-toggle"
                aria-pressed={photos}
                onClick={() => onChange({ photos: !photos })}
            >
                <span className="photo-toggle-box" aria-hidden="true">{photos && <Check size={14} />}</span>
                With photos only
            </button>
            <span className="home-sort-select">
                <label htmlFor={sortId}>Sort</label>
                <select id={sortId} value={sort} onChange={e => onChange({ sort: e.target.value })}>
                    {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </span>
        </div>
        </>
    )
}
