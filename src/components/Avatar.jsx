import { User } from 'lucide-react'

// Deterministic brand-aligned backgrounds (inks, so white initials read well).
// Muted/varied rather than all-teal so a grid of avatars doesn't get noisy.
const COLORS = ['#027268', '#1f6a8c', '#6b7d13', '#2a2a4a']

function getInitials(name) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('')
}

function hash(str) {
    let h = 0
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
    return h
}

const ICON_SIZE = { sm: 14, md: 18, lg: 24 }

export default function Avatar({ name, anonymous = false, size = 'md' }) {
    const cls = `avatar avatar-${size}`
    const trimmed = name?.trim()

    if (anonymous || !trimmed) {
        return (
            <span className={`${cls} avatar-anon`} aria-hidden="true">
                <User size={ICON_SIZE[size] ?? 18} />
            </span>
        )
    }

    const initials = getInitials(trimmed)
    const bg = COLORS[hash(trimmed) % COLORS.length]
    return (
        <span className={cls} style={{ background: bg }} aria-hidden="true">
            {initials}
        </span>
    )
}
