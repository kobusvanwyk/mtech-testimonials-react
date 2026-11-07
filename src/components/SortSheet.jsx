import { useState, useId } from 'react'
import { createPortal } from 'react-dom'
import { SlidersHorizontal, Check, X, RotateCcw } from 'lucide-react'
import { useDialog } from '../lib/useDialog'
import { SORTS } from '../lib/resultsParams'

// Phones only: one "Sort & filter" button that opens a bottom sheet (ui-guide
// filter panel, as a bottom sheet on mobile) with the sort choice, the
// "With photos only" switch and Reset. Changes apply straight away.
// `iconOnly` is the 44px round version used inside the filter band.
export default function SortSheet({ sort, photos, onChange, iconOnly = false, className = '' }) {
    const [open, setOpen] = useState(false)
    const ref = useDialog(open, () => setOpen(false))
    const titleId = useId()
    const changed = sort !== 'newest' || photos

    return (
        <>
            <button
                type="button"
                className={`sort-sheet-btn${iconOnly ? ' is-icon' : ''}${changed ? ' is-set' : ''} ${className}`}
                aria-haspopup="dialog"
                aria-label={iconOnly ? `Sort and filter${changed ? ' (changed)' : ''}` : undefined}
                onClick={() => setOpen(true)}
            >
                <SlidersHorizontal size={18} aria-hidden="true" />
                {!iconOnly && <span>Sort &amp; filter</span>}
                {changed && <span className="sort-sheet-dot" aria-hidden="true" />}
            </button>

            {open && createPortal(
                <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
                    <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                        <div className="sheet-head">
                            <h2 id={titleId}>Sort &amp; filter</h2>
                            <button type="button" className="sheet-x" onClick={() => setOpen(false)} aria-label="Close">
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>

                        <div className="sheet-group" role="radiogroup" aria-label="Sort">
                            <div className="sheet-group-h" aria-hidden="true">Sort</div>
                            {SORTS.map(s => (
                                <button
                                    key={s.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={sort === s.value}
                                    className="sheet-opt"
                                    data-autofocus={sort === s.value ? '' : undefined}
                                    onClick={() => onChange({ sort: s.value })}
                                >
                                    {s.label}
                                    {sort === s.value && <Check size={18} aria-hidden="true" />}
                                </button>
                            ))}
                        </div>

                        <div className="sheet-group">
                            <div className="sheet-group-h">Show</div>
                            <button
                                type="button"
                                className="photo-toggle sheet-toggle"
                                aria-pressed={photos}
                                onClick={() => onChange({ photos: !photos })}
                            >
                                <span className="photo-toggle-box" aria-hidden="true">{photos && <Check size={14} />}</span>
                                With photos only
                            </button>
                        </div>

                        <div className="sheet-ft">
                            <button type="button" className="btn-ghost" disabled={!changed} onClick={() => onChange({ sort: 'newest', photos: false })}>
                                <RotateCcw size={16} aria-hidden="true" /> Reset
                            </button>
                            <button type="button" className="btn-primary" onClick={() => setOpen(false)}>Done</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
