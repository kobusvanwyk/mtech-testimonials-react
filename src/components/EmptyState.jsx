// Guide empty state (ui-guide #empty): what's empty, why, and the one action to fix it.
// `card` puts it on the guide card ground (used inside admin pages).
export default function EmptyState({ icon: Icon, title, children, action, card = false, tone, headingLevel = 2, className = '' }) {
    const H = `h${headingLevel}`
    return (
        <div className={`empty${card ? ' empty-card' : ''}${tone ? ` empty-${tone}` : ''}${className ? ` ${className}` : ''}`}>
            {Icon && <Icon size={48} strokeWidth={1.25} className="empty-ic" aria-hidden="true" />}
            <H className="empty-title">{title}</H>
            {children && <p className="empty-text">{children}</p>}
            {action}
        </div>
    )
}
