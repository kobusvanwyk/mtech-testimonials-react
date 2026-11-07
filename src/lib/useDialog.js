import { useEffect, useLayoutEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

// Open dialogs, newest last. Only the top one reacts to Escape and Tab, so a
// confirm opened over another dialog closes on its own.
const stack = []

// Modal dialog behaviour (ui-guide Overlays / DESIGN.md App shell):
// focus moves inside without scrolling the page, Tab stays inside, Escape
// closes, page scroll is locked (html has scrollbar-gutter: stable so nothing
// shifts), and focus returns to whatever opened the dialog.
// Put data-autofocus on the element that should receive focus first.
export function useDialog(open, onClose) {
    const ref = useRef(null)
    const closeRef = useRef(onClose)
    useLayoutEffect(() => { closeRef.current = onClose })

    useEffect(() => {
        if (!open) return
        const el = ref.current
        const opener = document.activeElement
        const first = el?.querySelector('[data-autofocus]') || el?.querySelector(FOCUSABLE)
        first?.focus({ preventScroll: true })
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        stack.push(el)
        function onKey(e) {
            if (stack[stack.length - 1] !== el) return
            if (e.key === 'Escape') { e.preventDefault(); closeRef.current?.(); return }
            if (e.key !== 'Tab' || !el) return
            const items = [...el.querySelectorAll(FOCUSABLE)]
            if (!items.length) return
            const a = items[0], z = items[items.length - 1]
            if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
            else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
        }
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('keydown', onKey)
            const i = stack.lastIndexOf(el)
            if (i >= 0) stack.splice(i, 1)
            document.body.style.overflow = prevOverflow
            if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
        }
    }, [open])

    return ref
}
