import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { generateUniqueSlug } from '../../lib/slugify'
import {
    Upload, FileText, Check, X, AlertTriangle,
    ChevronDown, ChevronUp, Images, Copy, Loader, ChevronRight
} from 'lucide-react'

const REQUIRED_COLUMNS = ['title', 'story_text']
const EXPECTED_COLUMNS = [
    'title', 'person_name', 'anonymous', 'conditions', 'products',
    'story_text', 'date', 'gallery_urls'
]
const BUCKET = 'testimonial-images'
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

// ── Image Uploader Panel ──────────────────────────────────────────────────────

function ImageUploaderPanel() {
    const [open, setOpen] = useState(false)
    const [uploads, setUploads] = useState([])   // { id, file, status, url, error }
    const [dragging, setDragging] = useState(false)
    const [copiedId, setCopiedId] = useState(null)
    const inputRef = useRef()

    function handleFiles(files) {
        const newUploads = Array.from(files).map(file => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            status: 'pending',   // pending | uploading | done | error
            url: null,
            error: null,
        }))
        setUploads(prev => [...prev, ...newUploads])
        newUploads.forEach(u => uploadFile(u))
    }

    async function uploadFile(upload) {
        // Validate
        if (!ACCEPTED_IMAGE_TYPES.includes(upload.file.type)) {
            return setUploads(prev => prev.map(u =>
                u.id === upload.id ? { ...u, status: 'error', error: 'Invalid file type' } : u
            ))
        }
        if (upload.file.size > MAX_IMAGE_SIZE) {
            return setUploads(prev => prev.map(u =>
                u.id === upload.id ? { ...u, status: 'error', error: 'File too large (max 5MB)' } : u
            ))
        }

        setUploads(prev => prev.map(u =>
            u.id === upload.id ? { ...u, status: 'uploading' } : u
        ))

        try {
            const ext = upload.file.name.split('.').pop()
            const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
            const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, upload.file)
            if (uploadErr) throw uploadErr
            const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
            setUploads(prev => prev.map(u =>
                u.id === upload.id ? { ...u, status: 'done', url: publicUrl } : u
            ))
        } catch (err) {
            setUploads(prev => prev.map(u =>
                u.id === upload.id ? { ...u, status: 'error', error: err.message } : u
            ))
        }
    }

    function copyUrl(upload) {
        navigator.clipboard.writeText(upload.url)
        setCopiedId(upload.id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    function removeUpload(id) {
        setUploads(prev => prev.filter(u => u.id !== id))
    }

    const doneCount = uploads.filter(u => u.status === 'done').length
    const pendingCount = uploads.filter(u => ['pending', 'uploading'].includes(u.status)).length

    return (
        <div className="img-upload-panel">
            <button className="img-upload-toggle" onClick={() => setOpen(o => !o)}>
                <Images size={16} />
                <span>Upload Images for Import</span>
                {doneCount > 0 && <span className="img-upload-badge">{doneCount} ready</span>}
                {pendingCount > 0 && <span className="img-upload-badge uploading">{pendingCount} uploading…</span>}
                {open ? <ChevronUp size={15} className="toggle-chevron" /> : <ChevronRight size={15} className="toggle-chevron" />}
            </button>

            {open && (
                <div className="img-upload-body">
                    <p className="img-upload-hint">
                        Upload images here first, then copy their URLs into your CSV.
                        Images are saved to Supabase Storage and will be stable permanent links.
                    </p>

                    {/* Drop zone */}
                    <label
                        className={`img-upload-dropzone ${dragging ? 'dragging' : ''}`}
                        onDragOver={e => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={e => {
                            e.preventDefault()
                            setDragging(false)
                            handleFiles(e.dataTransfer.files)
                        }}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="dropzone-input"
                            onChange={e => handleFiles(e.target.files)}
                        />
                        <Upload size={28} className="dropzone-icon" />
                        <span className="dropzone-main">Click or drag images here</span>
                        <span className="dropzone-sub">JPG, PNG, WebP, GIF — max 5MB each</span>
                    </label>

                    {/* Upload list */}
                    {uploads.length > 0 && (
                        <div className="img-upload-list">
                            {uploads.map(u => (
                                <div key={u.id} className={`img-upload-row ${u.status}`}>
                                    {/* Thumbnail */}
                                    <div className="img-upload-thumb">
                                        {u.status === 'done'
                                            ? <img src={u.url} alt={u.file.name} />
                                            : <div className="img-upload-thumb-placeholder">
                                                {u.status === 'uploading' && <Loader size={16} className="spin" />}
                                                {u.status === 'error' && <AlertTriangle size={16} />}
                                                {u.status === 'pending' && <Upload size={16} />}
                                            </div>
                                        }
                                    </div>

                                    {/* Info */}
                                    <div className="img-upload-info">
                                        <span className="img-upload-name">{u.file.name}</span>
                                        {u.status === 'done' && (
                                            <span className="img-upload-url">{u.url}</span>
                                        )}
                                        {u.status === 'uploading' && (
                                            <span className="img-upload-status-text">Uploading…</span>
                                        )}
                                        {u.status === 'pending' && (
                                            <span className="img-upload-status-text">Waiting…</span>
                                        )}
                                        {u.status === 'error' && (
                                            <span className="img-upload-error-text">{u.error}</span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="img-upload-actions">
                                        {u.status === 'done' && (
                                            <button
                                                className={`img-upload-copy ${copiedId === u.id ? 'copied' : ''}`}
                                                onClick={() => copyUrl(u)}
                                                title="Copy URL"
                                            >
                                                {copiedId === u.id ? <Check size={14} /> : <Copy size={14} />}
                                                {copiedId === u.id ? 'Copied!' : 'Copy URL'}
                                            </button>
                                        )}
                                        <button
                                            className="img-upload-remove"
                                            onClick={() => removeUpload(u.id)}
                                            title="Remove"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── CSV Parsing ───────────────────────────────────────────────────────────────

function convertGoogleDriveUrl(url) {
    if (!url) return url
    const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`
    return url
}

function parseCSV(text) {
    // Normalise Windows line endings
    const lines = text.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')

    // Auto-detect delimiter: semicolon or comma
    const delimiter = lines[0].includes(';') ? ';' : ','

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^\"|\"$/g, '').toLowerCase())

    const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c))
    if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`)

    const rows = []
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Handle quoted fields with delimiter inside
        const values = []
        let current = ''
        let inQuotes = false
        for (let c = 0; c < line.length; c++) {
            const ch = line[c]
            if (ch === '"') {
                inQuotes = !inQuotes
            } else if (ch === delimiter && !inQuotes) {
                values.push(current.trim())
                current = ''
            } else {
                current += ch
            }
        }
        values.push(current.trim())

        const row = {}
        headers.forEach((h, idx) => {
            row[h] = values[idx] ?? ''
        })
        rows.push({ _line: i + 1, ...row })
    }
    return rows
}

function validateRow(row) {
    const errors = []
    if (!row.title?.trim()) errors.push('Title is required')
    if (!row.story_text?.trim()) errors.push('Story text is required')
    if (row.story_text?.trim().length < 20) errors.push('Story text too short (min 20 characters)')
    if (row.date && isNaN(Date.parse(row.date))) errors.push(`Invalid date: "${row.date}" (use YYYY-MM-DD)`)
    return errors
}

function buildRecord(row, filename) {
    const anonymous = row.anonymous?.toLowerCase() === 'true'
    const conditions = row.conditions ? row.conditions.split('|').map(s => s.trim()).filter(Boolean) : []
    const products = row.products ? row.products.split('|').map(s => s.trim()).filter(Boolean) : []
    const gallery_urls = row.gallery_urls ? row.gallery_urls.split('|').map(s => convertGoogleDriveUrl(s.trim())).filter(Boolean) : []
    const created_at = row.date?.trim() ? new Date(row.date.trim()).toISOString() : new Date().toISOString()

    return {
        title: row.title.trim(),
        person_name: anonymous ? null : (row.person_name?.trim() || null),
        anonymous,
        conditions,
        products,
        story_text: row.story_text.trim(),
        gallery_urls,
        created_at,
        status: 'pending',
        is_imported: true,
        imported_from: filename,
    }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ImportTestimonials() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [parseError, setParseError] = useState(null)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const [expandedRow, setExpandedRow] = useState(null)
    const fileRef = useRef()

    function handleFileChange(e) {
        const f = e.target.files[0]
        if (!f) return
        if (!f.name.endsWith('.csv')) {
            setParseError('Please upload a .csv file.')
            return
        }
        setFile(f)
        setPreview(null)
        setParseError(null)
        setImportResult(null)

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const rows = parseCSV(evt.target.result)
                const valid = []
                const invalid = []
                rows.forEach((row, i) => {
                    const errors = validateRow(row, i)
                    if (errors.length) {
                        invalid.push({ ...row, _errors: errors })
                    } else {
                        valid.push(row)
                    }
                })
                setPreview({ valid, invalid, filename: f.name })
            } catch (err) {
                setParseError(err.message)
            }
        }
        reader.readAsText(f)
    }

    async function handleImport() {
        if (!preview?.valid?.length) return
        setImporting(true)
        const results = { imported: 0, failed: [] }

        for (const row of preview.valid) {
            try {
                const record = buildRecord(row, preview.filename)
                record.slug = await generateUniqueSlug(record.title)
                const { error } = await supabase.from('testimonials').insert([record])
                if (error) throw error
                results.imported++
            } catch (err) {
                results.failed.push({ title: row.title, error: err.message })
            }
        }

        setImporting(false)
        setImportResult(results)
        setPreview(null)
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
    }

    function reset() {
        setFile(null)
        setPreview(null)
        setParseError(null)
        setImportResult(null)
        if (fileRef.current) fileRef.current.value = ''
    }

    return (
        <div className="admin-page-content">
            <div className="edit-header">
                <h2>Bulk Import Testimonials</h2>
                <a href="/sample-import.csv" download className="btn-preview">
                    <FileText size={14} /> Download Sample CSV
                </a>
            </div>

            {/* ── Image Uploader Panel ── */}
            <ImageUploaderPanel />

            {/* ── Format guide ── */}
            <div className="import-guide">
                <h3><FileText size={15} /> Expected CSV format</h3>
                <div className="import-columns">
                    {EXPECTED_COLUMNS.map(col => (
                        <span key={col} className={`import-col-tag ${REQUIRED_COLUMNS.includes(col) ? 'required' : ''}`}>
                            {col}{REQUIRED_COLUMNS.includes(col) ? ' *' : ''}
                        </span>
                    ))}
                </div>
                <ul className="import-notes">
                    <li><strong>*</strong> title and story_text are required</li>
                    <li>Use <code>|</code> to separate multiple values: <code>Arthritis|Fatigue</code></li>
                    <li>Set <code>anonymous</code> to <code>true</code> or <code>false</code></li>
                    <li>Use <code>YYYY-MM-DD</code> for dates — leave blank to use today</li>
                    <li>For images: upload them using the panel above, then paste the copied URLs into your CSV</li>
                    <li>All imports are saved as <strong>Pending</strong> for your review</li>
                </ul>
            </div>

            {/* ── Upload area ── */}
            {!preview && !importResult && (
                <label
                    className="import-dropzone"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                        e.preventDefault()
                        const f = e.dataTransfer.files[0]
                        if (f) {
                            if (fileRef.current) fileRef.current.value = ''
                            handleFileChange({ target: { files: [f] } })
                        }
                    }}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="dropzone-input"
                    />
                    <Upload size={36} className="dropzone-icon" />
                    <span className="dropzone-main">Click to select a CSV file</span>
                    <span className="dropzone-sub">or drag and drop</span>
                    <span className="dropzone-hint">.csv files only</span>
                </label>
            )}

            {parseError && (
                <div className="import-error">
                    <AlertTriangle size={16} /> {parseError}
                    <button onClick={reset} className="import-reset">Try again</button>
                </div>
            )}

            {/* ── Preview ── */}
            {preview && (
                <div className="import-preview">
                    <div className="import-preview-header">
                        <h3>Preview — <strong>{preview.filename}</strong></h3>
                        <button onClick={reset} className="import-reset"><X size={14} /> Cancel</button>
                    </div>

                    <div className="import-summary">
                        <div className="import-summary-item valid">
                            <Check size={15} /> <strong>{preview.valid.length}</strong> ready to import
                        </div>
                        {preview.invalid.length > 0 && (
                            <div className="import-summary-item invalid">
                                <AlertTriangle size={15} /> <strong>{preview.invalid.length}</strong> row(s) with errors (will be skipped)
                            </div>
                        )}
                    </div>

                    {preview.invalid.length > 0 && (
                        <div className="import-invalid-list">
                            <h4>Rows with errors (skipped):</h4>
                            {preview.invalid.map((row, i) => (
                                <div key={i} className="import-invalid-row">
                                    <span className="import-row-title">Line {row._line}: {row.title || '(no title)'}</span>
                                    <ul>{row._errors.map((e, j) => <li key={j}>{e}</li>)}</ul>
                                </div>
                            ))}
                        </div>
                    )}

                    {preview.valid.length > 0 && (
                        <div className="import-table-wrap">
                            <table className="import-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Title</th>
                                        <th>Name</th>
                                        <th>Conditions</th>
                                        <th>Products</th>
                                        <th>Date</th>
                                        <th>Images</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.valid.map((row, i) => (
                                        <>
                                            <tr key={i} className={expandedRow === i ? 'expanded' : ''}>
                                                <td>{row._line}</td>
                                                <td className="import-td-title">{row.title}</td>
                                                <td>{row.anonymous?.toLowerCase() === 'true' ? <em>Anonymous</em> : row.person_name || '—'}</td>
                                                <td>{row.conditions || '—'}</td>
                                                <td>{row.products || '—'}</td>
                                                <td>{row.date || <em>Today</em>}</td>
                                                <td>{row.gallery_urls ? <Check size={13} className="import-check" /> : '—'}</td>
                                                <td>
                                                    <button
                                                        className="import-expand-btn"
                                                        onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                                                    >
                                                        {expandedRow === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedRow === i && (
                                                <tr key={`exp-${i}`} className="import-story-row">
                                                    <td colSpan={8}>
                                                        <p className="import-story-text">{row.story_text}</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {preview.valid.length > 0 && (
                        <button
                            className="btn-import"
                            onClick={handleImport}
                            disabled={importing}
                        >
                            {importing
                                ? 'Importing...'
                                : <><Upload size={15} /> Import {preview.valid.length} Testimonial{preview.valid.length !== 1 ? 's' : ''}</>
                            }
                        </button>
                    )}
                </div>
            )}

            {/* ── Result ── */}
            {importResult && (
                <div className="import-result">
                    <div className="import-result-success">
                        <Check size={24} />
                        <h3>{importResult.imported} testimonial{importResult.imported !== 1 ? 's' : ''} imported successfully</h3>
                        <p>All imports are saved as <strong>Pending</strong> — review them in the Pending queue.</p>
                    </div>
                    {importResult.failed.length > 0 && (
                        <div className="import-invalid-list">
                            <h4>{importResult.failed.length} failed to save:</h4>
                            {importResult.failed.map((f, i) => (
                                <div key={i} className="import-invalid-row">
                                    <span className="import-row-title">{f.title}</span>
                                    <ul><li>{f.error}</li></ul>
                                </div>
                            ))}
                        </div>
                    )}
                    <button className="btn-import" onClick={reset}>
                        <Upload size={15} /> Import Another File
                    </button>
                </div>
            )}
        </div>
    )
}
