import { useState, useEffect, useRef, useCallback } from 'react'
import { MoreHorizontal } from 'lucide-react'

// Overflow "More" menu (ui-guide .dropdown-menu with an .icon-btn trigger).
// Children are menu items: elements with role="menuitem" (button or link) and <hr />.
// Arrow keys move between items, Escape closes and returns focus to the trigger,
// clicking outside or choosing an item closes it.
export default function MoreMenu({ label = 'More actions', children }) {
    const [open, setOpen] = useState(false)
    const btnRef  = useRef(null)
    const listRef = useRef(null)

    const close = useCallback((returnFocus) => {
        setOpen(false)
        if (returnFocus) btnRef.current?.focus({ preventScroll: true })
    }, [])

    useEffect(() => {
        if (!open) return
        listRef.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true })
        function onDown(e) {
            if (!listRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) close(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open, close])

    function onKey(e) {
        const items = [...listRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')]
        const i = items.indexOf(document.activeElement)
        if (e.key === 'Escape')         { e.preventDefault(); close(true) }
        else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
        else if (e.key === 'ArrowUp')   { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
        else if (e.key === 'Tab')       { close(false) }
    }

    return (
        <div className="more-menu">
            <button
                ref={btnRef}
                type="button"
                className="icon-btn"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                onClick={() => setOpen(v => !v)}
            >
                <MoreHorizontal size={20} aria-hidden="true" />
            </button>
            {open && (
                <div
                    ref={listRef}
                    className="more-menu-list"
                    role="menu"
                    aria-label={label}
                    onKeyDown={onKey}
                    onClick={e => { if (e.target.closest('[role="menuitem"]')) close(true) }}
                >
                    {children}
                </div>
            )}
        </div>
    )
}
