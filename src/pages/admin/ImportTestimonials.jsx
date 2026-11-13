import { useState, useRef, useCallback, Fragment } from 'react'
import Alert from '../../components/Alert'
import { supabase } from '../../lib/supabase'
import { optimiseImage } from '../../lib/imageTools'
import { generateUniqueSlug } from '../../lib/slugify'
import { cleanConditions } from '../../lib/syncConditions'
import {
    Upload, FileText, Check, X, AlertTriangle,
    ChevronDown, Images, Loader, ImagePlus
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

// Soft checks for the import preview ("to check" rows, tinted amber). These
// rows still import as Pending; the messages tell the reviewer what to look at.
const SHORT_STORY_WORDS = 40

function normTitle(t) {
    return (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function rowWarnings(row, rows, existingTitles) {
    const out = []
    const list = v => (v || '').split(/[,|]/).map(x => x.trim()).filter(Boolean)
    if (!list(row.conditions).length) out.push('No conditions listed, so it will not show under any condition.')
    if (!list(row.products).length) out.push('No products listed.')
    const words = (row.story_text || '').trim().split(/\s+/).filter(Boolean).length
    if (words < SHORT_STORY_WORDS) out.push(`Very short testimonial (${words} words).`)
    const t = normTitle(row.title)
    if (t && existingTitles.has(t)) out.push('A testimonial with this title already exists.')
    const twin = rows.find(r => r !== row && normTitle(r.title) === t)
    if (t && twin) out.push(`Same title as line ${twin._line} in this file.`)
    return out
}

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
            const file = await optimiseImage(uploadItem.file)   // WebP, long edge 2000px
            const ext = file.name.split('.').pop()
            const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
            const { error } = await supabase.storage.from(BUCKET).upload(path, file)
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
    if (!row.story_text?.trim()) errors.push('Testimonial text is required')
    if (row.story_text?.trim().length < 20) errors.push('Testimonial text too short (min 20 characters)')
    if (row.date && isNaN(Date.parse(row.date))) errors.push(`Invalid date: "${row.date}" (use YYYY-MM-DD)`)
    return errors
}

function buildRecord(row, filename, uploadedUrls = []) {
    const anonymous = row.anonymous?.toLowerCase() === 'true'
    const conditions = row.conditions ? cleanConditions(row.conditions.split('|')) : []
    const products = row.products ? row.products.split('|').map(s => s.trim()).filter(Boolean) : []
    const csvUrls = row.gallery_urls ? row.gallery_urls.split('|').map(s => convertGoogleDriveUrl(s.trim())).filter(Boolean) : []
    // Merge CSV urls with any images uploaded inline, deduplicated
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
    const [csvDrag, setCsvDrag] = useState(false)

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
        reader.onload = async (evt) => {
            try {
                const rows = parseCSV(evt.target.result)
                const valid = [], invalid = []
                rows.forEach((row) => {
                    const errors = validateRow(row)
                    errors.length ? invalid.push({ ...row, _errors: errors }) : valid.push(row)
                })
                // Existing titles, for the duplicate-title check (read only).
                let existing = new Set()
                try {
                    const { data } = await supabase.from('testimonials').select('title')
                    existing = new Set((data || []).map(t => normTitle(t.title)).filter(Boolean))
                } catch { /* check skipped if the lookup fails */ }
                valid.forEach(row => { row._warnings = rowWarnings(row, valid, existing) })
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
                <h1>Import CSV</h1>
                <a href="/sample-import.csv" download className="btn-secondary">
                    <FileText size={16} aria-hidden="true" /> Download sample CSV
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
                    <li>Use <code>YYYY-MM-DD</code> for dates, or leave blank to use today</li>
                    <li>Images can be added per testimonial in the preview, or included as URLs in the <code>gallery_urls</code> column</li>
                    <li>All imports are saved as <strong>Pending</strong> for your review</li>
                </ul>
            </div>

            {/* ── CSV drop zone ── */}
            {!preview && !importResult && (
                <label
                    className={`dropzone ${csvDrag ? 'drag' : ''}`}
                    onDragOver={e => { e.preventDefault(); setCsvDrag(true) }}
                    onDragLeave={() => setCsvDrag(false)}
                    onDrop={e => {
                        e.preventDefault()
                        setCsvDrag(false)
                        const f = e.dataTransfer.files[0]
                        if (f) { if (fileRef.current) fileRef.current.value = ''; handleFileChange({ target: { files: [f] } }) }
                    }}
                >
                    <Upload size={32} className="dropzone-icon" aria-hidden="true" />
                    <span className="dropzone-main">Drag a CSV file here or click to browse</span>
                    <span className="dropzone-sub">.csv files only</span>
                    <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="dropzone-input" />
                </label>
            )}

            {parseError && (
                <Alert
                    type="error"
                    title="This file could not be read"
                    action={<button type="button" onClick={reset} className="btn-secondary btn-sm">Choose another file</button>}
                >
                    {parseError}
                </Alert>
            )}

            {/* Preview (ui-guide #tbl-import): one card with a summary bar and a
                table that becomes cards below 820px. Error rows stay in the list,
                tinted red with their messages, so nothing silently disappears. */}
            {preview && (() => {
                const rows = [
                    ...preview.valid.map((row, vi) => ({ row, vi, ok: true })),
                    ...preview.invalid.map(row => ({ row, vi: null, ok: false })),
                ].sort((x, y) => (x.row._line || 0) - (y.row._line || 0))
                const split = v => (v || '').split(/[,|]/).map(x => x.trim()).filter(Boolean)
                return (
                    <div className="ip">
                        <div className="ip-sum">
                            <div className="ip-counts">
                                <span className="ip-file"><FileText size={16} aria-hidden="true" /> {preview.filename}</span>
                                <span className="ip-lead">{rows.length} row{rows.length !== 1 ? 's' : ''} checked</span>
                                <span className="status-badge badge-approved">{preview.valid.filter(r => !r._warnings?.length).length} ready</span>
                                {preview.valid.some(r => r._warnings?.length) && <span className="status-badge badge-pending">{preview.valid.filter(r => r._warnings?.length).length} to check</span>}
                                {preview.invalid.length > 0 && <span className="status-badge badge-rejected">{preview.invalid.length} will be skipped</span>}
                                {uploadingCount > 0 && (
                                    <span className="ip-uploading"><Loader size={14} className="spin" aria-hidden="true" /> {uploadingCount} image{uploadingCount !== 1 ? 's' : ''} still uploading…</span>
                                )}
                            </div>
                            <div className="ip-sum-acts">
                                <button type="button" onClick={reset} className="btn-ghost"><X size={16} aria-hidden="true" /> Cancel</button>
                                {preview.valid.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={handleImport}
                                        disabled={importing || uploadingCount > 0}
                                        title={uploadingCount > 0 ? 'Wait for images to finish uploading' : ''}
                                    >
                                        {importing
                                            ? 'Importing…'
                                            : uploadingCount > 0
                                                ? <><Loader size={16} className="spin" aria-hidden="true" /> Waiting for uploads…</>
                                                : <><Upload size={16} aria-hidden="true" /> Import {preview.valid.length} as Pending</>}
                                    </button>
                                )}
                            </div>
                        </div>

                        <table role="table" aria-label="Import preview">
                            <thead>
                                <tr role="row">
                                    <th role="columnheader" className="c-num">#</th>
                                    <th role="columnheader" className="c-main">Testimonial</th>
                                    <th role="columnheader" className="c-tags">Conditions &amp; products</th>
                                    <th role="columnheader" className="c-imgs">Images</th>
                                    <th role="columnheader" className="c-check">Check</th>
                                    <th role="columnheader" className="c-exp"><span className="sr-only">Details</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(({ row, vi, ok }) => {
                                    const key = row._line ?? vi
                                    const open = expandedRow === key
                                    const imgs = ok ? (rowImages[vi] || []) : []
                                    const doneCount = imgs.filter(u => u.status === 'done').length
                                    const csvCount = row.gallery_urls ? row.gallery_urls.split('|').filter(Boolean).length : 0
                                    const totalCount = doneCount + csvCount
                                    const isUploading = imgs.some(u => u.status === 'uploading' || u.status === 'pending')
                                    const conds = split(row.conditions)
                                    const prods = split(row.products)
                                    const tagCount = conds.length + prods.length
                                    const imgCell = isUploading
                                        ? <span className="import-img-badge uploading"><Loader size={11} className="spin" aria-hidden="true" /> uploading</span>
                                        : totalCount > 0
                                            ? <span className="import-img-badge done"><Images size={11} aria-hidden="true" /> {totalCount}</span>
                                            : <span className="ip-muted">None</span>
                                    return (
                                        <Fragment key={key}>
                                            <tr role="row" className={!ok ? 'is-err' : row._warnings?.length ? 'is-warn' : ''}>
                                                <td role="cell" className="c-num">{row._line}</td>
                                                <td role="cell" className="c-main">
                                                    <span className="ip-title">{row.title || <em>No title</em>}</span>
                                                    <div className="ip-meta">
                                                        <span>{row.anonymous?.toLowerCase() === 'true' ? <em>Anonymous</em> : (row.person_name || <em>No name</em>)}</span>
                                                        <span>{row.date || 'Today'}</span>
                                                        {(isUploading || totalCount > 0) && <span className="ip-imgs-inline">{imgCell}</span>}
                                                    </div>
                                                </td>
                                                <td role="cell" className="c-tags">
                                                    <div className="ip-chips">
                                                        {conds.slice(0, 3).map(c => <span key={'c' + c} className="tag tag-outline tag-condition">{c}</span>)}
                                                        {prods.slice(0, Math.max(0, 3 - conds.length)).map(p => <span key={'p' + p} className="tag tag-outline tag-product">{p}</span>)}
                                                        {tagCount > 3 && <span className="ip-muted">+{tagCount - 3} more</span>}
                                                        {tagCount === 0 && <span className="ip-muted">No tags</span>}
                                                    </div>
                                                </td>
                                                <td role="cell" className="c-imgs">{imgCell}</td>
                                                <td role="cell" className="c-check">
                                                    {ok && row._warnings?.length ? (
                                                        <div className="ip-check">
                                                            <span className="status-badge badge-pending">To check</span>
                                                            {row._warnings.map((w, j) => <span key={j} className="ip-msg ip-msg--warn">{w}</span>)}
                                                        </div>
                                                    ) : ok ? (
                                                        <span className="status-badge badge-approved">Ready</span>
                                                    ) : (
                                                        <div className="ip-check">
                                                            <span className="status-badge badge-rejected">Will be skipped</span>
                                                            {row._errors.map((e, j) => <span key={j} className="ip-msg">{e}</span>)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td role="cell" className="c-exp">
                                                    <button
                                                        type="button"
                                                        className="icon-btn ip-exp"
                                                        aria-expanded={open}
                                                        aria-label={`${open ? 'Hide' : 'Show'} details for line ${row._line}`}
                                                        onClick={() => setExpandedRow(open ? null : key)}
                                                    >
                                                        <ChevronDown size={18} aria-hidden="true" />
                                                    </button>
                                                </td>
                                            </tr>
                                            {open && (
                                                <tr role="row" className="ip-detail">
                                                    <td role="cell" colSpan={6}>
                                                        <p className={`ip-story ${row.story_text ? '' : 'is-empty'}`}>{row.story_text || 'No testimonial text in this row.'}</p>
                                                        {conds.length > 0 && <><div className="ip-label">Conditions ({conds.length})</div><div className="ip-chips">{conds.map(c => <span key={c} className="tag tag-condition">{c}</span>)}</div></>}
                                                        {prods.length > 0 && <><div className="ip-label">Products ({prods.length})</div><div className="ip-chips">{prods.map(p => <span key={p} className="tag tag-product">{p}</span>)}</div></>}
                                                        {ok && (
                                                            <RowImageUploader
                                                                rowIndex={vi}
                                                                images={rowImages[vi] || []}
                                                                onImagesChange={handleRowImagesChange}
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            })()}

            {/* ── Result ── */}
            {importResult && (
                <div className="import-result">
                    <Alert type="success" title={`${importResult.imported} testimonial${importResult.imported !== 1 ? 's' : ''} imported`}>
                        They are saved as <strong>Pending</strong>. Review them in the Pending Review queue.
                    </Alert>
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
                    <button type="button" className="btn-secondary" onClick={reset}>
                        <Upload size={15} /> Import Another File
                    </button>
                </div>
            )}
        </div>
    )
}
