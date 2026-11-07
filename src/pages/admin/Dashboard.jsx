import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { DashboardSkeleton } from '../../components/Skeleton'
import { ArrowRight } from 'lucide-react'
import { StatusBadge } from '../../components/TestimonialTable'

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

    if (loading) return <DashboardSkeleton />

    const maxCond = topConditions[0]?.[1] || 1
    const maxProd = topProducts[0]?.[1] || 1

    return (
        <div className="admin-page-content">
            <h1>Dashboard</h1>

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
                            <h2 className="breakdown-title" id="top-conditions">Top Conditions <span className="breakdown-sub">(published)</span></h2>
                            <ol className="barchart" aria-labelledby="top-conditions">
                                {topConditions.map(([name, count]) => (
                                    <li key={name} className="bc-row">
                                        <span className="bc-lbl" title={name}>{name}</span>
                                        <span className="bc-track" aria-hidden="true">
                                            <span className="bc-fill cond" style={{ width: `${(count / maxCond) * 100}%` }} />
                                        </span>
                                        <span className="bc-val">{count}<span className="sr-only"> testimonials</span></span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                    {topProducts.length > 0 && (
                        <div className="breakdown-panel">
                            <h2 className="breakdown-title" id="top-products">Top Products <span className="breakdown-sub">(published)</span></h2>
                            <ol className="barchart" aria-labelledby="top-products">
                                {topProducts.map(([name, count]) => (
                                    <li key={name} className="bc-row">
                                        <span className="bc-lbl" title={name}>{name}</span>
                                        <span className="bc-track" aria-hidden="true">
                                            <span className="bc-fill prod" style={{ width: `${(count / maxProd) * 100}%` }} />
                                        </span>
                                        <span className="bc-val">{count}<span className="sr-only"> testimonials</span></span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            )}

            <div className="dashboard-section">
                <div className="dashboard-section-header">
                    <h2 id="recent-title">Recent Submissions</h2>
                    <Link to="/admin/all" className="view-all-link">
                        View all <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                </div>
                <ul className="lrow-list" aria-labelledby="recent-title">
                    {recent.map(t => (
                        <li key={t.id} className="lrow">
                            <div className="main">
                                <span className="t" title={t.title}>{t.title}</span>
                                <span className="m">
                                    {t.anonymous ? 'Anonymous' : (t.person_name || 'Unknown')}
                                    {' · '}
                                    {new Date(t.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="end">
                                <StatusBadge status={t.status} />
                                <Link to={`/admin/edit/${t.id}`} className="btn-ghost btn-sm" aria-label={`Edit ${t.title}`}>Edit</Link>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
