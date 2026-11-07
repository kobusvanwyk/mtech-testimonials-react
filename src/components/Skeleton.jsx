// Shimmer skeleton placeholders (ui-guide §Skeleton loaders).

export function Skeleton({ width, height, radius, className = '' }) {
    return (
        <span
            className={`skel ${className}`}
            style={{ width, height, borderRadius: radius }}
            aria-hidden="true"
        />
    )
}

// Matches the testimonial-card footprint so the grid doesn't jump on load.
export function TestimonialCardSkeleton() {
    return (
        <div className="testimonial-card card-skeleton" aria-hidden="true">
            <div className="card-body">
                <span className="skel skel-title" />
                <span className="skel skel-title short" />
                <div className="skel-author">
                    <span className="skel skel-avatar" />
                    <span className="skel skel-line" style={{ width: '40%' }} />
                </div>
                <span className="skel skel-line" />
                <span className="skel skel-line" />
                <span className="skel skel-line" style={{ width: '70%' }} />
                <div className="skel-tags">
                    <span className="skel skel-chip" />
                    <span className="skel skel-chip" />
                    <span className="skel skel-chip" />
                </div>
            </div>
        </div>
    )
}

// A grid of card skeletons for the public listing's loading state.
export function TestimonialGridSkeleton({ count = 6 }) {
    return (
        <div className="testimonials-grid" aria-busy="true" aria-label="Loading testimonials">
            {Array.from({ length: count }).map((_, i) => (
                <TestimonialCardSkeleton key={i} />
            ))}
        </div>
    )
}

// Admin table loading state (All Testimonials).
export function TableSkeleton({ rows = 8 }) {
    return (
        <div className="tt-skel" aria-busy="true" aria-label="Loading">
            {Array.from({ length: rows }).map((_, i) => (
                <div className="table-skel-row" key={i}>
                    <span className="skel skel-line" style={{ width: '28%' }} />
                    <span className="skel skel-line" style={{ width: '14%' }} />
                    <span className="skel skel-chip" />
                    <span className="skel skel-badge" />
                </div>
            ))}
        </div>
    )
}

// Admin image grid loading state (Image Manager).
export function ImageGridSkeleton({ count = 12 }) {
    return (
        <div className="img-grid" aria-busy="true" aria-label="Loading images">
            {Array.from({ length: count }).map((_, i) => (
                <div className="img-skel-tile" key={i}>
                    <span className="skel skel-thumb" />
                    <span className="skel skel-line" style={{ width: '80%' }} />
                    <span className="skel skel-line" style={{ width: '50%' }} />
                </div>
            ))}
        </div>
    )
}

// Admin Dashboard loading state (stat tiles + breakdown bars).
export function DashboardSkeleton() {
    return (
        <div className="admin-page-content" aria-busy="true" aria-label="Loading">
            <span className="skel skel-page-title" />
            <div className="stats-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div className="stat-card" key={i}>
                        <span className="skel" style={{ width: 64, height: 30, marginBottom: 8, display: 'block' }} />
                        <span className="skel skel-line" style={{ width: '70%' }} />
                    </div>
                ))}
            </div>
            <div className="breakdown-grid">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div className="breakdown-panel" key={i}>
                        <span className="skel" style={{ width: 150, height: 16, marginBottom: 18, display: 'block' }} />
                        {Array.from({ length: 7 }).map((_, j) => (
                            <div className="skel-bar-row" key={j}>
                                <span className="skel skel-line" style={{ width: '28%' }} />
                                <span className="skel skel-line skel-bar" />
                                <span className="skel skel-line" style={{ width: 22 }} />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

// Admin form pages (Settings, PDF Settings).
export function FormSkeleton({ sections = 4 }) {
    return (
        <div className="admin-page-content" aria-busy="true" aria-label="Loading">
            <div className="edit-header">
                <span className="skel" style={{ width: 200, height: 26 }} />
                <span className="skel" style={{ width: 130, height: 40, borderRadius: 'var(--radius-pill)' }} />
            </div>
            {Array.from({ length: sections }).map((_, i) => (
                <div className="settings-section" key={i} style={{ marginBottom: 16 }}>
                    <span className="skel skel-line" style={{ width: '38%', height: 14, marginBottom: 12 }} />
                    <span className="skel skel-field" />
                </div>
            ))}
        </div>
    )
}

// Admin Edit Testimonial (header + 2-column form).
export function EditTestimonialSkeleton() {
    return (
        <div className="admin-page-content" aria-busy="true" aria-label="Loading">
            <div className="edit-header">
                <span className="skel" style={{ width: 60, height: 20 }} />
                <span className="skel" style={{ width: 160, height: 26 }} />
                <span className="skel" style={{ width: 220, height: 40, borderRadius: 'var(--radius-pill)' }} />
            </div>
            <div className="edit-grid">
                <div className="edit-main">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div className="edit-section" key={i} style={{ marginBottom: 20 }}>
                            <span className="skel skel-line" style={{ width: '30%', height: 12, marginBottom: 8 }} />
                            <span className="skel skel-field" style={{ height: i === 2 ? 160 : 44 }} />
                        </div>
                    ))}
                </div>
                <div>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div className="settings-section" key={i} style={{ marginBottom: 16 }}>
                            <span className="skel skel-line" style={{ width: '50%', height: 12, marginBottom: 10 }} />
                            <span className="skel skel-field" style={{ height: i === 1 ? 90 : 44 }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Admin list pages (Categories).
export function ListPageSkeleton({ rows = 8 }) {
    return (
        <div className="admin-page-content" aria-busy="true" aria-label="Loading">
            <span className="skel skel-page-title" />
            <div className="testimonial-table-wrap">
                {Array.from({ length: rows }).map((_, i) => (
                    <div className="table-skel-row" key={i}>
                        <span className="skel skel-line" style={{ width: '40%' }} />
                        <span className="skel skel-chip" />
                    </div>
                ))}
            </div>
        </div>
    )
}

// Single testimonial detail page.
export function SingleSkeleton() {
    return (
        <div className="single-page" aria-busy="true" aria-label="Loading">
            <div className="single-top-bar">
                <span className="skel skel-line" style={{ width: 170, height: 16 }} />
            </div>
            <article className="single-article">
                <div className="single-head">
                    <span className="skel" style={{ width: '70%', height: 40, display: 'block' }} />
                </div>
                <div className="single-about">
                    <span className="skel skel-line" style={{ width: '60%' }} />
                    <div className="single-tags">
                        <span className="skel skel-chip" />
                        <span className="skel skel-chip" />
                        <span className="skel skel-chip" />
                    </div>
                </div>
                <div className="single-body">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <span
                            key={i}
                            className="skel skel-line"
                            style={{ width: i % 4 === 3 ? '55%' : '100%', marginBottom: 12 }}
                        />
                    ))}
                </div>
            </article>
        </div>
    )
}

// Pending Review queue (review-card list).
export function ReviewSkeleton({ cards = 3 }) {
    return (
        <div className="review-queue" aria-busy="true" aria-label="Loading">
            {Array.from({ length: cards }).map((_, i) => (
                <div className="review-card" key={i}>
                    <span className="skel skel-line" style={{ width: '55%', height: 20, marginBottom: 12 }} />
                    <span className="skel skel-line" style={{ width: '35%', marginBottom: 16 }} />
                    <span className="skel skel-line" style={{ width: '100%' }} />
                    <span className="skel skel-line" style={{ width: '100%' }} />
                    <span className="skel skel-line" style={{ width: '70%', marginBottom: 16 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <span className="skel" style={{ width: 110, height: 40, borderRadius: 'var(--radius-pill)' }} />
                        <span className="skel" style={{ width: 130, height: 40, borderRadius: 'var(--radius-pill)' }} />
                        <span className="skel" style={{ width: 90, height: 40, borderRadius: 'var(--radius-pill)' }} />
                    </div>
                </div>
            ))}
        </div>
    )
}
