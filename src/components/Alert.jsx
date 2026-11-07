import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info }

// Inline message (ui-guide #alerts .alert): tinted ground, 3px coloured edge,
// icon, optional bold title, body text, optional dismiss. Errors are announced
// straight away (role="alert"), the rest politely (role="status").
// Write messages for people: what happened and what to do, never raw errors.
export default function Alert({ type = 'info', title, children, onClose, action, className = '' }) {
    const Icon = ICONS[type] || Info
    return (
        <div className={`alert alert-${type} ${className}`} role={type === 'error' ? 'alert' : 'status'}>
            <Icon size={18} className="alert-ic" aria-hidden="true" />
            <div className="alert-text">
                {title && <div className="alert-ttl">{title}</div>}
                {children && <div className="alert-bd">{children}</div>}
            </div>
            {action}
            {onClose && (
                <button type="button" className="alert-x" aria-label="Dismiss message" onClick={onClose}>
                    <X size={16} aria-hidden="true" />
                </button>
            )}
        </div>
    )
}
