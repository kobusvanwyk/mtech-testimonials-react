// Site-wide rule for showing people's names on the public site and in PDFs
// (site_settings key `name_display`, set in Admin > Settings). Admin screens
// always show the real name. A testimonial ticked Anonymous stays anonymous.
export const NAME_MODES = [
    { value: 'full',      label: 'Show names',        hint: 'Each name as submitted, unless the person chose to stay anonymous.' },
    { value: 'first',     label: 'First names only',  hint: 'Only the first name, for example "Lena Swanepoel" shows as "Lena".' },
    { value: 'anonymous', label: 'Anonymous for all', hint: 'Every testimonial shows "Anonymous" with a plain avatar.' },
    { value: 'hidden',    label: 'Hide names and avatars', hint: 'No name, no "Anonymous" and no avatar on any testimonial.' },
]

export function normaliseNameMode(v) {
    return NAME_MODES.some(m => m.value === v) ? v : 'full'
}

// The name to show for a testimonial, or null when it should read "Anonymous".
export function displayName(t, mode = 'full') {
    const name = (t?.person_name || '').trim()
    if (!name || t?.anonymous || mode === 'anonymous' || mode === 'hidden') return null
    if (mode === 'first') return name.split(/\s+/)[0]
    return name
}

// True when the author line (avatar + name or "Anonymous") is left out entirely.
export function hidesAuthor(mode) {
    return mode === 'hidden'
}
