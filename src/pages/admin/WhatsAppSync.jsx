import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { generateUniqueSlug } from '../../lib/slugify'

// Matches both Android and iOS WhatsApp export formats:
// [DD/MM/YYYY, HH:MM:SS] Sender: Text
// DD/MM/YYYY, HH:MM - Sender: Text
const MSG_REGEX = /^[\[\(]?(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)[\]\)]?\s*[-–]\s*([^:]+?):\s(.+)$/

function parseWhatsAppExport(text) {
  const lines = text.split('\n')
  const messages = []
  let current = null

  for (const line of lines) {
    const match = line.match(MSG_REGEX)
    if (match) {
      if (current) messages.push(current)
      const [, date, time, sender, firstLine] = match
      current = {
        id: `${date}_${time}_${sender.trim()}`.replace(/\s+/g, '_').replace(/[^\w\-]/g, ''),
        sender: sender.trim(),
        timestamp: `${date} ${time}`,
        text: firstLine.trim(),
      }
    } else if (current && line.trim()) {
      // Continuation of previous message
      current.text += '\n' + line.trim()
    }
  }
  if (current) messages.push(current)

  return messages
}

function classifyMessage(msg) {
  const text = msg.text.trim()

  // Voice notes / media
  if (/^<[^>]*(omitted|attached)[^>]*>$/i.test(text)) {
    return { skip: true, reason: text.toLowerCase().includes('audio') || text.toLowerCase().includes('voice') ? 'voice note' : 'media omitted' }
  }

  // System messages (no sender means system)
  if (!msg.sender || msg.sender === 'You') return { skip: true, reason: 'system message' }

  // Too short to be a testimonial
  if (text.length < 80) return { skip: true, reason: 'too short' }

  return { skip: false }
}

const STATUS_LABELS = {
  idle: '',
  parsing: 'Parsing file...',
  checking: 'Checking for already-imported messages...',
  enriching: 'Enriching with Claude AI...',
  saving: 'Saving testimonials...',
  done: 'Done',
  error: 'Error',
}

export default function WhatsAppSync() {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [dryRun, setDryRun] = useState(false)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [settings, setSettings] = useState({
    whatsapp_group_name: '',
    whatsapp_last_synced: '',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['whatsapp_group_name', 'whatsapp_last_synced', 'whatsapp_synced_ids'])
    if (data) {
      const map = Object.fromEntries(data.map(r => [r.key, r.value]))
      setSettings(map)
    }
  }

  async function getSyncedIds() {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'whatsapp_synced_ids')
      .single()
    if (!data?.value) return new Set()
    try { return new Set(JSON.parse(data.value)) } catch { return new Set() }
  }

  async function saveSyncedIds(ids) {
    await supabase.from('site_settings').upsert(
      [{ key: 'whatsapp_synced_ids', value: JSON.stringify([...ids]) }],
      { onConflict: 'key' }
    )
  }

  async function saveLastSynced() {
    const now = new Date().toISOString()
    await supabase.from('site_settings').upsert(
      [{ key: 'whatsapp_last_synced', value: now }],
      { onConflict: 'key' }
    )
    setSettings(s => ({ ...s, whatsapp_last_synced: now }))
  }

  async function saveGroupName(name) {
    await supabase.from('site_settings').upsert(
      [{ key: 'whatsapp_group_name', value: name }],
      { onConflict: 'key' }
    )
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    if (!f.name.endsWith('.txt')) {
      setError('Please upload a .txt file exported from WhatsApp.')
      return
    }
    setFile(f)
    setError('')
    setResults(null)
  }

  async function handleSync() {
    if (!file) return
    setStatus('parsing')
    setError('')
    setResults(null)
    setProgress('')

    try {
      // 1. Parse file
      const text = await file.text()
      const allMessages = parseWhatsAppExport(text)

      // Pre-filter obvious non-testimonials
      const preFiltered = []
      const preSkipped = []
      for (const msg of allMessages) {
        const { skip, reason } = classifyMessage(msg)
        if (skip) preSkipped.push({ msg, reason })
        else preFiltered.push(msg)
      }

      if (preFiltered.length === 0) {
        setStatus('done')
        setResults({ imported: 0, skipped: preSkipped.length, details: [], preSkipped })
        return
      }

      // 2. Check already synced
      setStatus('checking')
      const syncedIds = await getSyncedIds()
      const newMessages = preFiltered.filter(m => !syncedIds.has(m.id))
      const alreadySynced = preFiltered.filter(m => syncedIds.has(m.id))

      if (newMessages.length === 0) {
        setStatus('done')
        setResults({
          imported: 0,
          skipped: preSkipped.length + alreadySynced.length,
          alreadySynced: alreadySynced.length,
          details: [],
          preSkipped,
        })
        return
      }

      // 3. Enrich via Claude
      setStatus('enriching')
      setProgress(`Enriching ${newMessages.length} messages with Claude...`)

      const response = await fetch('/.netlify/functions/whatsapp-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        if (err.error === 'rate_limit') throw new Error('Claude API rate limit reached. Please wait a moment and try again.')
        if (err.error === 'billing') throw new Error('Claude API billing issue. Check your Anthropic account.')
        if (err.error === 'overloaded') throw new Error('Claude API is overloaded. Please try again in a minute.')
        throw new Error('Enrichment failed. Please try again.')
      }

      const { results: enriched } = await response.json()

      // Separate testimonials from non-testimonials
      const testimonials = enriched.filter(r => r.is_testimonial)
      const notTestimonials = enriched.filter(r => !r.is_testimonial)

      if (dryRun || testimonials.length === 0) {
        setStatus('done')
        setResults({
          imported: 0,
          dryRun: true,
          wouldImport: testimonials.length,
          skipped: preSkipped.length + alreadySynced.length + notTestimonials.length,
          alreadySynced: alreadySynced.length,
          notTestimonials: notTestimonials.length,
          details: testimonials,
          preSkipped,
        })
        return
      }

      // 4. Save to Supabase
      setStatus('saving')
      setProgress(`Saving ${testimonials.length} testimonials...`)

      const saved = []
      const failed = []

      for (const item of testimonials) {
        try {
          const slug = await generateUniqueSlug(item.title || 'WhatsApp Testimonial')
          const record = {
            title: item.title || 'WhatsApp Testimonial',
            person_name: item.person_name || null,
            anonymous: item.anonymous || false,
            conditions: item.conditions || [],
            products: item.products || [],
            story_text: item.story_text || '',
            status: 'imported_pending',
            is_imported: true,
            imported_from: `whatsapp:${item.id}`,
            source: 'whatsapp',
            slug,
            gallery_urls: [],
          }
          const { error: insertError } = await supabase.from('testimonials').insert(record)
          if (insertError) throw insertError
          saved.push(item)
        } catch (e) {
          failed.push({ item, error: e.message })
        }
      }

      // 5. Update synced IDs (include all processed, even non-testimonials, so we don't reprocess them)
      const allProcessedIds = [...syncedIds, ...newMessages.map(m => m.id)]
      await saveSyncedIds(new Set(allProcessedIds))
      await saveLastSynced()

      setStatus('done')
      setResults({
        imported: saved.length,
        failed: failed.length,
        skipped: preSkipped.length + alreadySynced.length + notTestimonials.length,
        alreadySynced: alreadySynced.length,
        notTestimonials: notTestimonials.length,
        details: saved,
        failedDetails: failed,
        preSkipped,
      })

    } catch (err) {
      setStatus('error')
      setError(err.message || 'Something went wrong.')
    }
  }

  const isBusy = ['parsing', 'checking', 'enriching', 'saving'].includes(status)
  const lastSynced = settings.whatsapp_last_synced
    ? new Date(settings.whatsapp_last_synced).toLocaleString('en-ZA')
    : 'Never'

  return (
    <div className="whatsapp-sync-page">
      <div className="page-header">
        <h1>
          <span className="wa-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </span>
          WhatsApp Sync
        </h1>
        <p className="page-subtitle">
          Import testimonials from a WhatsApp group export. Export the chat from WhatsApp, upload the .txt file, and Claude will extract and format the testimonials automatically.
        </p>
      </div>

      {/* Settings strip */}
      <div className="wa-settings-strip">
        <div className="wa-setting">
          <label>Group Name</label>
          <input
            type="text"
            value={settings.whatsapp_group_name || ''}
            placeholder="e.g. Mannatech Testimonials SA"
            onChange={e => setSettings(s => ({ ...s, whatsapp_group_name: e.target.value }))}
            onBlur={e => saveGroupName(e.target.value)}
          />
        </div>
        <div className="wa-setting wa-setting--readonly">
          <label>Last Synced</label>
          <span>{lastSynced}</span>
        </div>
      </div>

      {/* How to export instructions */}
      <div className="wa-howto">
        <strong>How to export from WhatsApp:</strong>
        <ol>
          <li>Open the group on your phone</li>
          <li>Tap the group name → <em>Export chat</em></li>
          <li>Choose <em>Without media</em></li>
          <li>Save or share the .txt file to your computer</li>
          <li>Upload it below</li>
        </ol>
      </div>

      {/* Upload area */}
      <div
        className={`wa-upload-area ${file ? 'wa-upload-area--has-file' : ''}`}
        onClick={() => !isBusy && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault() }}
        onDrop={e => {
          e.preventDefault()
          if (isBusy) return
          const f = e.dataTransfer.files[0]
          if (f) {
            const fakeEvent = { target: { files: [f] } }
            handleFile(fakeEvent)
          }
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        {file ? (
          <div className="wa-file-selected">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>{file.name}</span>
            <button
              className="wa-remove-file"
              onClick={e => { e.stopPropagation(); setFile(null); setResults(null); setError('') }}
            >✕</button>
          </div>
        ) : (
          <div className="wa-upload-prompt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
            </svg>
            <p>Drop your WhatsApp export .txt file here, or click to browse</p>
          </div>
        )}
      </div>

      {error && <div className="wa-error">{error}</div>}

      {/* Controls */}
      <div className="wa-controls">
        <label className="wa-dry-run-toggle">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={e => setDryRun(e.target.checked)}
            disabled={isBusy}
          />
          <span>Dry run — preview without saving</span>
        </label>

        <button
          className="btn-wa-sync"
          onClick={handleSync}
          disabled={!file || isBusy}
        >
          {isBusy ? (
            <><span className="wa-spinner" /> {STATUS_LABELS[status]}</>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {dryRun ? 'Preview Import' : 'Sync Now'}
            </>
          )}
        </button>
      </div>

      {/* Progress */}
      {isBusy && progress && (
        <div className="wa-progress">{progress}</div>
      )}

      {/* Results */}
      {results && status === 'done' && (
        <div className="wa-results">
          <h3>{results.dryRun ? '🔍 Dry Run Preview' : '✅ Sync Complete'}</h3>

          <div className="wa-stats">
            {results.dryRun ? (
              <div className="wa-stat wa-stat--imported">
                <span className="wa-stat-num">{results.wouldImport}</span>
                <span className="wa-stat-label">would be imported</span>
              </div>
            ) : (
              <div className="wa-stat wa-stat--imported">
                <span className="wa-stat-num">{results.imported}</span>
                <span className="wa-stat-label">testimonials imported</span>
              </div>
            )}
            <div className="wa-stat wa-stat--skipped">
              <span className="wa-stat-num">{results.skipped}</span>
              <span className="wa-stat-label">messages skipped</span>
            </div>
            {results.alreadySynced > 0 && (
              <div className="wa-stat wa-stat--synced">
                <span className="wa-stat-num">{results.alreadySynced}</span>
                <span className="wa-stat-label">already imported</span>
              </div>
            )}
            {results.failed > 0 && (
              <div className="wa-stat wa-stat--failed">
                <span className="wa-stat-num">{results.failed}</span>
                <span className="wa-stat-label">failed to save</span>
              </div>
            )}
          </div>

          <div className="wa-skip-breakdown">
            {results.preSkipped?.length > 0 && (
              <p>
                <strong>{results.preSkipped.length}</strong> messages skipped before AI processing:
                {' '}voice notes / media ({results.preSkipped.filter(s => s.reason === 'voice note' || s.reason === 'media omitted').length}),
                {' '}too short ({results.preSkipped.filter(s => s.reason === 'too short').length})
              </p>
            )}
            {results.notTestimonials > 0 && (
              <p><strong>{results.notTestimonials}</strong> messages identified by Claude as not testimonials (greetings, replies, etc.)</p>
            )}
          </div>

          {!results.dryRun && results.imported > 0 && (
            <p className="wa-imported-link">
              Imported testimonials are ready for review under{' '}
              <a href="/admin/all?status=imported_pending">All Testimonials → Imported Pending</a>.
            </p>
          )}

          {/* Preview of what was/would be imported */}
          {results.details?.length > 0 && (
            <div className="wa-details">
              <h4>{results.dryRun ? 'Would import:' : 'Imported:'}</h4>
              {results.details.map((item, i) => (
                <div key={i} className="wa-detail-card">
                  <div className="wa-detail-title">{item.title}</div>
                  <div className="wa-detail-meta">
                    {item.person_name && <span>👤 {item.person_name}</span>}
                    {item.conditions?.length > 0 && <span>🏥 {item.conditions.join(', ')}</span>}
                    {item.products?.length > 0 && <span>💊 {item.products.join(', ')}</span>}
                  </div>
                  {item.review_notes && (
                    <div className="wa-detail-flag">⚠️ {item.review_notes}</div>
                  )}
                  <div className="wa-detail-excerpt">
                    {item.story_text?.slice(0, 200)}{item.story_text?.length > 200 ? '...' : ''}
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
