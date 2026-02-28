export default function SearchBar({ value, onChange }) {
    return (
        <div className="search-bar">
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Search by condition, product, or keyword..."
                className="search-input"
            />
            {value && (
                <button className="search-clear" onClick={() => onChange('')}>✕</button>
            )}
        </div>
    )
}