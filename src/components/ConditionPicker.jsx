import { useState, useRef, useId, useMemo } from 'react'
import { X, Plus } from 'lucide-react'
import { cleanConditionName } from '../lib/syncConditions'

// Health condition picker for the Add and Edit Testimonial pages: the chosen
// conditions as chips, a search box with suggestions (ARIA combobox, arrow
// keys and Enter), and the most used conditions as one-click chips. Replaces
// a checkbox grid that had grown to 180+ options.
//
// value     string[]   chosen conditions
// options   string[]   the master list (conditions table)
// popular   string[]   most used first (shown when not chosen yet)
// onChange  (string[]) => void

const MAX_SUGGESTIONS = 8

export default function ConditionPicker({ value = [], options = [], popular = [], onChange, label = 'Health Conditions' }) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const inputRef = useRef(null)
    const uid = useId()
    const listId = `${uid}-list`
    const labelId = `${uid}-label`

    const chosen = useMemo(() => new Set(value.map(v => v.toLowerCase())), [value])
    const q = query.trim().toLowerCase()

    // Starts-with matches first, then contains, then alphabetical
    const suggestions = useMemo(() => {
        if (!q) return []
        return options
            .filter(o => !chosen.has(o.toLowerCase()) && o.toLowerCase().includes(q))
            .sort((a, b) => {
                const as = a.toLowerCase().startsWith(q) ? 0 : 1
                const bs = b.toLowerCase().startsWith(q) ? 0 : 1
                return as - bs || a.localeCompare(b)
            })
            .slice(0, MAX_SUGGESTIONS)
    }, [q, options, chosen])

    const cleaned = cleanConditionName(query)
    const exists = cleaned && (chosen.has(cleaned.toLowerCase()) || options.some(o => o.toLowerCase() === cleaned.toLowerCase()))
    // The last row offers the typed text as a new condition
    const rows = [...suggestions.map(s => ({ name: s, isNew: false })), ...(cleaned && !exists ? [{ name: cleaned, isNew: true }] : [])]
    const showList = open && rows.length > 0

    function add(name) {
        const clean = cleanConditionName(name)
        if (!clean || chosen.has(clean.toLowerCase())) return
        // Use the list's own spelling when it is already there
        const match = options.find(o => o.toLowerCase() === clean.toLowerCase())
        onChange([...value, match || clean])
        setQuery('')
        setActive(0)
        inputRef.current?.focus()
    }

    function remove(name) {
        onChange(value.filter(v => v !== name))
        inputRef.current?.focus()
    }

    function onKeyDown(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, rows.length - 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
        else if (e.key === 'Enter') {
            if (rows.length) { e.preventDefault(); add(rows[Math.min(active, rows.length - 1)].name) }
        }
        else if (e.key === 'Escape') {
            if (open && query) { e.preventDefault(); e.stopPropagation(); setOpen(false) }
        }
        else if (e.key === 'Backspace' && !query && value.length) {
            onChange(value.slice(0, -1))
        }
    }

    const quick = popular.filter(p => !chosen.has(p.toLowerCase())).slice(0, 12)

    return (
        <fieldset className="edit-section condition-picker">
            <legend className="edit-label" id={labelId}>{label}</legend>

            {value.length > 0 ? (
                <ul className="cp-chosen" aria-label="Chosen conditions">
                    {value.map(v => (
                        <li key={v} className="cp-chip">
                            {v}
                            <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`} title="Remove">
                                <X size={14} aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="cp-none">None chosen yet.</p>
            )}

            <div className="cp-combo">
                <input
                    ref={inputRef}
                    type="text"
                    className="edit-input"
                    role="combobox"
                    aria-labelledby={labelId}
                    aria-autocomplete="list"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-activedescendant={showList ? `${listId}-${Math.min(active, rows.length - 1)}` : undefined}
                    placeholder={`Search ${options.length} conditions or type a new one`}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0) }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={onKeyDown}
                    autoComplete="off"
                />
                {showList && (
                    <ul className="cp-list" id={listId} role="listbox" aria-labelledby={labelId}>
                        {rows.map((r, i) => (
                            <li
                                key={(r.isNew ? 'new:' : '') + r.name}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === active}
                                className={`cp-option ${i === active ? 'active' : ''} ${r.isNew ? 'new' : ''}`}
                                onMouseDown={e => { e.preventDefault(); add(r.name) }}
                                onMouseEnter={() => setActive(i)}
                            >
                                {r.isNew ? <><Plus size={14} aria-hidden="true" /> Add “{r.name}” as a new condition</> : r.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {quick.length > 0 && (
                <div className="cp-quick">
                    <span className="cp-quick-label">Most used:</span>
                    {quick.map(p => (
                        <button key={p} type="button" className="cp-quick-chip" onClick={() => add(p)}>
                            <Plus size={12} aria-hidden="true" /> {p}
                        </button>
                    ))}
                </div>
            )}
        </fieldset>
    )
}
