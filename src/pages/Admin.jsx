import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Check, X, CheckCircle } from 'lucide-react'

const ADMIN_PASSWORD = 'mannatech2024'

export default function Admin() {
    const [authed, setAuthed] = useState(
        sessionStorage.getItem('adminAuthed') === 'true'
    )
    const [password, setPassword] = useState('')
    const [pending, setPending] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authed) fetchPending()
    }, [authed])

    async function fetchPending() {
        const { data } = await supabase
            .from('testimonials')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
        setPending(data || [])
        setLoading(false)
    }

    async function updateStatus(id, status) {
        await supabase.from('testimonials').update({ status }).eq('id', id)
        setPending(prev => prev.filter(t => t.id !== id))
    }

    if (!authed) {
        return (
            <div className="admin-login">
                <h2>Admin Access</h2>
                <input
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && password === ADMIN_PASSWORD) {
                            sessionStorage.setItem('adminAuthed', 'true')
                            setAuthed(true)
                        }
                    }}
                />
                <button onClick={() => {
                    if (password === ADMIN_PASSWORD) {
                        sessionStorage.setItem('adminAuthed', 'true')
                        setAuthed(true)
                    }
                }}>
                    Login
                </button>
                {password && password !== ADMIN_PASSWORD && (
                    <p className="error">Incorrect password</p>
                )}
            </div>
        )
    }

    if (loading) return <div className="loading">Loading pending submissions...</div>

    return (
        <div className="admin-page">
            <h2>Pending Testimonials ({pending.length})</h2>
            {pending.length === 0 && (
                <p><CheckCircle size={16} /> No pending testimonials. All caught up!</p>
            )}
            {pending.map(t => (
                <div key={t.id} className="admin-card">
                    <h3>{t.title}</h3>
                    <p><strong>By:</strong> {t.anonymous ? 'Anonymous' : t.person_name}</p>
                    <p><strong>Conditions:</strong> {t.conditions?.join(', ')}</p>
                    <p><strong>Products:</strong> {t.products?.join(', ')}</p>
                    <p><strong>Story:</strong></p>
                    <div className="admin-story">{t.story_text}</div>
                    <div className="admin-actions">
                        <button className="btn-approve" onClick={() => updateStatus(t.id, 'approved')}>
                            <Check size={14} /> Approve
                        </button>
                        <button className="btn-reject" onClick={() => updateStatus(t.id, 'rejected')}>
                            <X size={14} /> Reject
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}
