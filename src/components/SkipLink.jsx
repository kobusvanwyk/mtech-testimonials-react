// "Skip to content" (DESIGN.md App shell): the first focusable element on every
// page. Hidden until focused, then it moves focus to the page's <main>.
export default function SkipLink({ target = 'main-content' }) {
    function skip(e) {
        const main = document.getElementById(target)
        if (!main) return
        e.preventDefault()
        main.focus()
    }
    return <a className="skip-link" href={`#${target}`} onClick={skip}>Skip to content</a>
}
