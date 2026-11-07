import { useState, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { FeedbackContext } from '../lib/feedback'
import { useDialog } from '../lib/useDialog'

const TOAST_ICONS = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info }

// Guide modal used for every "are you sure" question (replaces window.confirm).
// Focus starts on Cancel so Enter never confirms a destructive action by accident.
function ConfirmDialog({ req, onAnswer }) {
    const ref = useDialog(true, () => onAnswer(false))
    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onAnswer(false)}>
            <div className="modal" ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={req.body ? 'confirm-body' : undefined}>
                <h3 id="confirm-title" className="modal-title">{req.title}</h3>
                {req.body && <p id="confirm-body">{req.body}</p>}
                <div className="modal-ft">
                    <button type="button" className="btn-secondary" data-autofocus onClick={() => onAnswer(false)}>
                        {req.cancelLabel || 'Cancel'}
                    </button>
                    <button type="button" className={req.tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={() => onAnswer(true)}>
                        {req.confirmLabel || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function FeedbackProvider({ children }) {
    const [confirmReq, setConfirmReq] = useState(null)
    const [toasts, setToasts] = useState([])
    const nextId = useRef(1)

    const confirm = useCallback(opts => new Promise(resolve => {
        setConfirmReq({ ...opts, resolve })
    }), [])

    const answer = useCallback(ok => {
        setConfirmReq(req => { req?.resolve(ok); return null })
    }, [])

    const dismiss = useCallback(id => setToasts(list => list.filter(t => t.id !== id)), [])

    const toast = useMemo(() => {
        const push = (type, message) => {
            const id = nextId.current++
            setToasts(list => [...list.slice(-2), { id, type, message }])
            setTimeout(() => dismiss(id), type === 'error' ? 9000 : 5000)
        }
        return {
            success: m => push('success', m),
            error:   m => push('error', m),
            warning: m => push('warning', m),
            info:    m => push('info', m),
        }
    }, [dismiss])

    const value = useMemo(() => ({ confirm, toast }), [confirm, toast])

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            {confirmReq && createPortal(<ConfirmDialog req={confirmReq} onAnswer={answer} />, document.body)}
            {createPortal(
                <div className="toast-wrap" aria-live="polite">
                    {toasts.map(t => {
                        const Icon = TOAST_ICONS[t.type] || Info
                        return (
                            <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
                                <Icon size={18} className="toast-ic" aria-hidden="true" />
                                <span className="toast-msg">{t.message}</span>
                                <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                                    <X size={16} aria-hidden="true" />
                                </button>
                            </div>
                        )
                    })}
                </div>,
                document.body
            )}
        </FeedbackContext.Provider>
    )
}
