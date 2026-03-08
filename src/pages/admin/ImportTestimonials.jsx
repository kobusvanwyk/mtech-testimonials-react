import { useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { generateUniqueSlug } from '../../lib/slugify'
import {
    Upload, FileText, Check, X, AlertTriangle,
    ChevronDown, ChevronUp, Images, Loader, ImagePlus
} from 'lucide-react'

const REQUIRED_COLUMNS = ['title', 'story_text']
const EXPECTED_COLUMNS = [
    'title', 'person_name', 'anonymous', 'conditions', 'products',
    'story_text', 'date', 'gallery_urls'
]
const BUCKET = 'testimonial-images'
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

// ── Per-row image uploader ────────────────────────────────────────────────────

function RowImageUploader({ rowIndex, images, onImagesChange }) {
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef()

    async function uploadFile(uploadItem) {
        if (!ACCEPTED_IMAGE_TYPES.includes(uploadItem.file.type)) {
            onImagesChange(rowIndex, prev => prev.map(u =>
                u.id === uploadItem.id ? { ...u, status: 'error', error: 'Invalid file type' } : u
            ))
            return
        }
        if (uploadItem.file.size > MAX_IMAGE_SIZE) {
            onImagesChange(rowIndex, prev => prev.map(u =>
                u.id === uploadItem.id ? { ...u, status: 'error', error: 'File too large (max 5MB)' } : u
            ))
            return
        }

        onImagesChange(rowIndex, prev => prev.map(u =>
            u.id === uploadItem.id ? { ...u, status: 'uploading' } : u
        ))

        try {
            const ext = uploadItem.file.name.split('.').pop()
            const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
            const { error } = await supabase.storage.from(BUCKET).upload(path, uploadItem.file)
            if (error) throw error
            const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
            onImagesChange(rowIndex, prev => prev.map(u =>
                u.id === uploadItem.id ? { ...u, status: 'done', url: publicUrl } : u
            ))
        } catch (err) {
            onImagesChange(rowIndex, prev => prev.map(u =>
                u.id === uploadItem.id ? { ...u, status: 'error', error: err.message } : u
            ))
        }
    }

    function handleFiles(files) {
        const newItems = Array.from(files).map(file => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            status: 'pending',
            url: null,
            error: null,
        }))
        onImagesChange(rowIndex, prev => [...prev, ...newItems])
        newItems.forEach(item => uploadFile(item))
    }

    function removeImage(id) {
        onImagesChange(rowIndex, prev => prev.filter(u => u.id !== id))
    }

    return (
        <div className="row-image-uploader">
            <div className="row-image-uploader-label">
                <ImagePlus size={13} /> Photos for this testimonial
            </div>

            {/* Thumbnails of already-uploaded images */}
            {images.length > 0 && (
                <div className="row-image-thumbs">
                    {images.map(u => (
                        <div key={u.id} className={`row-image-thumb-item ${u.status}`}>
                            {u.status === 'done' && (
                                <img src={u.url} alt={u.file.name} />
                            )}
                            {u.status === 'uploading' && (
                                <div className="row-thumb-placeholder">
                                    <Loader size={14} className="spin" />
                                </div>
                            )}
                            {u.status === 'error' && (
                                <div className="row-thumb-placeholder error" title={u.error}>
                                    <AlertTriangle size={14} />
                                </div>
                            )}
                            <button
                                className="row-thumb-remove"
                                onClick={() => removeImage(u.id)}
                                title="Remove"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}

                    {/* Inline add button */}
                    <label
                        className="row-thumb-add"
                        title="Add more images"
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
                            style={{ display: 'none' }}
                            onChange={e => handleFiles(e.target.files)}
                        />
                        <ImagePlus size={16} />
                    </label>
                </div>
            )}

            {/* Full dropzone when no images yet */}
            {images.length === 0 && (
                <label
                    className={`row-image-dropzone ${dragging ? 'dragging' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => {
                        e.preventDefault()
                        setDragging(false)
                        handleFiles(e.dataTransfer.files)
                    }}
                >
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={e => handleFiles(e.target.files)}
                    />
                    <Upload size={16} />
                    <span>Click or drag images here</span>
                </label>
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
    const lines = text.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')
    const delimiter = lines[0].includes(';') ? ';' : ','
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^\"|\"$/g, '').toLowerCase())
    const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c))
    if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`)

    const rows = []
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const values = []
        let current = ''
        let inQuotes = false
        for (let c = 0; c < line.length; c++) {
            const ch = line[c]
            if (ch === '"') { inQuotes = !inQuotes }
            else if (ch === delimiter && !inQuotes) { values.push(current.trim()); current = '' }
            else { current += ch }
        }
        values.push(current.trim())
        const row = {}
        headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })
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

function buildRecord(row, filename, uploadedUrls = []) {
    const anonymous = row.anonymous?.toLowerCase() === 'true'
    const conditions = row.conditions ? row.conditions.split('|').map(s => s.trim()).filter(Boolean) : []
    const products = row.products ? row.products.split('|').map(s => s.trim()).filter(Boolean) : []
    const csvUrls = row.gallery_urls ? row.gallery_urls.split('|').map(s => convertGoogleDriveUrl(s.trim())).filter(Boolean) : []
    // Merge CSV urls with any images uploaded inline — deduplicated
    const gallery_urls = [...new Set([...csvUrls, ...uploadedUrls])]
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
    // rowImages: { [rowIndex]: uploadItem[] }
    const [rowImages, setRowImages] = useState({})
    const fileRef = useRef()

    const handleRowImagesChange = useCallback((rowIndex, updater) => {
        setRowImages(prev => ({
            ...prev,
            [rowIndex]: updater(prev[rowIndex] || [])
        }))
    }, [])

    function handleFileChange(e) {
        const f = e.target.files[0]
        if (!f) return
        if (!f.name.endsWith('.csv')) { setParseError('Please upload a .csv file.'); return }
        setFile(f)
        setPreview(null)
        setParseError(null)
        setImportResult(null)
        setRowImages({})

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const rows = parseCSV(evt.target.result)
                const valid = [], invalid = []
                rows.forEach((row) => {
                    const errors = validateRow(row)
                    errors.length ? invalid.push({ ...row, _errors: errors }) : valid.push(row)
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

        for (let i = 0; i < preview.valid.length; i++) {
            const row = preview.valid[i]
            try {
                const uploadedUrls = (rowImages[i] || [])
                    .filter(u => u.status === 'done')
                    .map(u => u.url)
                const record = buildRecord(row, preview.filename, uploadedUrls)
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
        setRowImages({})
        if (fileRef.current) fileRef.current.value = ''
    }

    function reset() {
        setFile(null); setPreview(null); setParseError(null)
        setImportResult(null); setRowImages({})
        if (fileRef.current) fileRef.current.value = ''
    }

    // Count how many rows have pending uploads still in progress
    const uploadingCount = Object.values(rowImages).flat()
        .filter(u => u.status === 'uploading' || u.status === 'pending').length

    return (
        <div className="admin-page-content">
            <div className="edit-header">
                <h2>Bulk Import Testimonials</h2>
                <a href="/sample-import.csv" download className="btn-preview">
                    <FileText size={14} /> Download Sample CSV
                </a>
            </div>

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
                    <li>Images can be added per testimonial in the preview, or included as URLs in the <code>gallery_urls</code> column</li>
                    <li>All imports are saved as <strong>Pending</strong> for your review</li>
                </ul>
            </div>

            {/* ── CSV drop zone ── */}
            {!preview && !importResult && (
                <label
                    className="import-dropzone"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                        e.preventDefault()
                        const f = e.dataTransfer.files[0]
                        if (f) { if (fileRef.current) fileRef.current.value = ''; handleFileChange({ target: { files: [f] } }) }
                    }}
                >
                    <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="dropzone-input" />
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
                        {uploadingCount > 0 && (
                            <div className="import-summary-item uploading">
                                <Loader size={15} className="spin" /> <strong>{uploadingCount}</strong> image{uploadingCount !== 1 ? 's' : ''} still uploading…
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
                                    {preview.valid.map((row, i) => {
                                        const imgs = rowImages[i] || []
                                        const doneCount = imgs.filter(u => u.status === 'done').length
                                        const csvCount = row.gallery_urls ? row.gallery_urls.split('|').filter(Boolean).length : 0
                                        const totalCount = doneCount + csvCount
                                        const isUploading = imgs.some(u => u.status === 'uploading' || u.status === 'pending')

                                        return (
                                            <>
                                                <tr key={i} className={expandedRow === i ? 'expanded' : ''}>
                                                    <td>{row._line}</td>
                                                    <td className="import-td-title">{row.title}</td>
                                                    <td>{row.anonymous?.toLowerCase() === 'true' ? <em>Anonymous</em> : row.person_name || '—'}</td>
                                                    <td>{row.conditions || '—'}</td>
                                                    <td>{row.products || '—'}</td>
                                                    <td>{row.date || <em>Today</em>}</td>
                                                    <td>
                                                        {isUploading
                                                            ? <span className="import-img-badge uploading"><Loader size={11} className="spin" /> uploading</span>
                                                            : totalCount > 0
                                                                ? <span className="import-img-badge done"><Images size={11} /> {totalCount}</span>
                                                                : <span className="import-img-badge none">—</span>
                                                        }
                                                    </td>
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
                                                            <RowImageUploader
                                                                rowIndex={i}
                                                                images={rowImages[i] || []}
                                                                onImagesChange={handleRowImagesChange}
                                                            />
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {preview.valid.length > 0 && (
                        <button
                            className="btn-import"
                            onClick={handleImport}
                            disabled={importing || uploadingCount > 0}
                            title={uploadingCount > 0 ? 'Wait for images to finish uploading' : ''}
                        >
                            {importing
                                ? 'Importing...'
                                : uploadingCount > 0
                                    ? <><Loader size={15} className="spin" /> Waiting for uploads…</>
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
