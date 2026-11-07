import { useState, useId } from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useDialog } from '../lib/useDialog'
import { useToast } from '../lib/feedback'
import Alert from './Alert'

const MIN = 8

// Account menu > Change password. Any signed-in user (admin or finder) can
// replace the password they were given with their own.
export default function ChangePasswordDialog({ onClose }) {
    const ref = useDialog(true, onClose)
    const toast = useToast()
    const id = useId()
    const [pw, setPw] = useState('')
    const [pw2, setPw2] = useState('')
    const [show, setShow] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    async function submit(e) {
        e.preventDefault()
        setError(null)
        if (pw.length < MIN) { setError(`Use at least ${MIN} characters.`); return }
        if (pw !== pw2) { setError('The two passwords are not the same.'); return }
        setSaving(true)
        const { error: err } = await supabase.auth.updateUser({ password: pw })
        setSaving(false)
        if (err) {
            console.error(err)
            setError(/same|different from the old/i.test(err.message || '')
                ? 'That is your current password. Choose a new one.'
                : 'Your password could not be changed. Check your connection and try again.')
            return
        }
        toast.success('Your password is changed. Use it next time you sign in.')
        onClose()
    }

    return createPortal(
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <form ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} onSubmit={submit} noValidate>
                <h2 id={`${id}-t`} className="modal-title">Change password</h2>
                <p>Choose a password only you know. Use at least {MIN} characters.</p>

                {error && <Alert type="error">{error}</Alert>}

                <div className="pw-field">
                    <label className="edit-label" htmlFor={`${id}-a`}>New password</label>
                    <div className="pw-wrap">
                        <input
                            id={`${id}-a`}
                            className="edit-input"
                            type={show ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={pw}
                            onChange={e => setPw(e.target.value)}
                            placeholder="At least 8 characters"
                            data-autofocus
                        />
                        <button type="button" className="pw-eye" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide passwords' : 'Show passwords'} aria-pressed={show}>
                            {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                        </button>
                    </div>
                </div>
                <div className="pw-field">
                    <label className="edit-label" htmlFor={`${id}-b`}>Type it again</label>
                    <input
                        id={`${id}-b`}
                        className="edit-input"
                        type={show ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={pw2}
                        onChange={e => setPw2(e.target.value)}
                        placeholder="The same password"
                    />
                </div>

                <div className="modal-ft">
                    <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Change password'}</button>
                </div>
            </form>
        </div>,
        document.body
    )
}
