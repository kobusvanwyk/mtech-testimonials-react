export default function CategorySidebar({ conditions, products, activeFilter, onFilter, testimonials }) {
    function countFor(label) {
        return testimonials.filter(t =>
            t.conditions?.includes(label) || t.products?.includes(label)
        ).length
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-section">
                <h4 className="sidebar-heading">Browse by Condition</h4>
                {activeFilter && (
                    <button className="sidebar-clear" onClick={() => onFilter(null)}>
                        ✕ Clear filter
                    </button>
                )}
                <ul className="sidebar-list">
                    {conditions.map(c => (
                        <li
                            key={c}
                            className={`sidebar-item condition ${activeFilter === c ? 'active' : ''}`}
                            onClick={() => onFilter(activeFilter === c ? null : c)}
                        >
                            {c} <span className="sidebar-count">({countFor(c)})</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="sidebar-section">
                <h4 className="sidebar-heading">Browse by Product</h4>
                <ul className="sidebar-list">
                    {products.filter(p => countFor(p) > 0).map(p => (
                        <li
                            key={p}
                            className={`sidebar-item product ${activeFilter === p ? 'active' : ''}`}
                            onClick={() => onFilter(activeFilter === p ? null : p)}
                        >
                            {p} <span className="sidebar-count">({countFor(p)})</span>
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    )
}