import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowRight } from 'lucide-react'

const TOP_N = 10

export default function Dashboard() {
    const [stats, setStats] = useState(null)
    const [recent, setRecent] = useState([])
    const [topConditions, setTopConditions] = useState([])
    const [topProducts, setTopProducts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
        fetchRecent()
        fetchBreakdown()
    }, [])

    async function fetchStats() {
        const { data } = await supabase.from('testimonials').select('status, created_at')
        if (!data) return
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        setStats({
            total: data.length,
            pending: data.filter(t => t.status === 'pending').length,
            published: data.filter(t => t.status === 'approved').length,
            unpublished: data.filter(t => t.status === 'unpublished').length,
            needsEditing: data.filter(t => t.status === 'needs_editing').length,
            thisMonth: data.filter(t => new Date(t.created_at) >= startOfMonth).length,
        })
        setLoading(false)
    }

    async function fetchRecent() {
        const { data } = await supabase
            .from('testimonials')
            .select('id, title, person_name, anonymous, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5)
        setRecent(data || [])
    }

    async function fetchBreakdown() {
        const { data } = await supabase
            .from('testimonials')
            .select('conditions, products')
            .eq('status', 'approved')

        if (!data) return

        const condCount = {}
        const prodCount = {}

        for (const t of data) {
            for (const c of (t.conditions || [])) condCount[c] = (condCount[c] || 0) + 1
            for (const p of (t.products || [])) prodCount[p] = (prodCount[p] || 0) + 1
        }

        const sortedCond = Object.entries(condCount).sort((a, b) => b[1] - a[1]).slice(0, TOP_N)
        const sortedProd = Object.entries(prodCount).sort((a, b) => b[1] - a[1]).slice(0, TOP_N)

        setTopConditions(sortedCond)
        setTopProducts(sortedProd)
    }

    const statusBadge = (status) => {
        const map = {
            pending: { label: 'Pending', cls: 'badge-pending' },
            approved: { label: 'Published', cls: 'badge-approved' },
            unpublished: { label: 'Unpublished', cls: 'badge-unpublished' },
            needs_editing: { label: 'Needs Editing', cls: 'badge-needs-editing' },
            rejected: { label: 'Rejected', cls: 'badge-rejected' },
        }
        const s = map[status] || { label: status, cls: '' }
        return <span className={`status-badge ${s.cls}`}>{s.label}</span>
    }

    if (loading) return <div className="admin-page-content"><div className="loading">Loading...</div></div>

    const maxCond = topConditions[0]?.[1] || 1
    const maxProd = topProducts[0]?.[1] || 1

    return (
        <div className="admin-page-content">
            <h2>Dashboard</h2>

            <div className="stats-grid">
                <div className="stat-card stat-total">
                    <div className="stat-number">{stats.total}</div>
                    <div className="stat-label">Total Submissions</div>
                </div>
                <div className="stat-card stat-pending">
                    <div className="stat-number">{stats.pending}</div>
                    <div className="stat-label">Pending Review</div>
                    {stats.pending > 0 && (
                        <Link to="/admin/pending" className="stat-action">
                            Review now <ArrowRight size={13} />
                        </Link>
                    )}
                </div>
                <div className="stat-card stat-published">
                    <div className="stat-number">{stats.published}</div>
                    <div className="stat-label">Published</div>
                </div>
                <div className="stat-card stat-month">
                    <div className="stat-number">{stats.thisMonth}</div>
                    <div className="stat-label">This Month</div>
                </div>
                {stats.needsEditing > 0 && (
                    <div className="stat-card stat-editing">
                        <div className="stat-number">{stats.needsEditing}</div>
                        <div className="stat-label">Needs Editing</div>
                        <Link to="/admin/all?filter=needs_editing" className="stat-action">
                            View <ArrowRight size={13} />
                        </Link>
                    </div>
                )}
            </div>

            {/* Breakdown charts */}
            {(topConditions.length > 0 || topProducts.length > 0) && (
                <div className="breakdown-grid">
                    {topConditions.length > 0 && (
                        <div className="breakdown-panel">
                            <h3 className="breakdown-title">Top Conditions <span className="breakdown-sub">(published)</span></h3>
                            <div className="breakdown-bars">
                                {topConditions.map(([name, count]) => (
                                    <div key={name} className="breakdown-row">
                                        <span className="breakdown-label" title={name}>{name}</span>
                                        <div className="breakdown-bar-wrap">
                                            <div className="breakdown-bar breakdown-bar-condition" style={{ width: `${(count / maxCond) * 100}%` }} />
                                        </div>
                                        <span className="breakdown-count">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {topProducts.length > 0 && (
                        <div className="breakdown-panel">
                            <h3 className="breakdown-title">Top Products <span className="breakdown-sub">(published)</span></h3>
                            <div className="breakdown-bars">
                                {topProducts.map(([name, count]) => (
                                    <div key={name} className="breakdown-row">
                                        <span className="breakdown-label" title={name}>{name}</span>
                                        <div className="breakdown-bar-wrap">
                                            <div className="breakdown-bar breakdown-bar-product" style={{ width: `${(count / maxProd) * 100}%` }} />
                                        </div>
                                        <span className="breakdown-count">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="dashboard-section">
                <div className="dashboard-section-header">
                    <h3>Recent Submissions</h3>
                    <Link to="/admin/all" className="view-all-link">
                        View all <ArrowRight size={13} />
                    </Link>
                </div>
                <div className="recent-list">
                    {recent.map(t => (
                        <div key={t.id} className="recent-item">
                            <div className="recent-item-info">
                                <span className="recent-title">{t.title}</span>
                                <span className="recent-author">
                                    {t.anonymous ? 'Anonymous' : t.person_name}
                                    {' · '}
                                    {new Date(t.created_at).toLocaleDateString('en-ZA')}
                                </span>
                            </div>
                            <div className="recent-item-actions">
                                {statusBadge(t.status)}
                                <Link to={`/admin/edit/${t.id}`} className="btn-edit-small">Edit</Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
