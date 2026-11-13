import { useState, useRef, useEffect } from 'react'
import { postFunction } from '../../lib/authFetch'
import { Link } from 'react-router-dom'
import Alert from '../../components/Alert'
import { useConfirm, useToast, friendlyError } from '../../lib/feedback'
import { storyExcerpt } from '../../lib/storyText'
import { supabase } from '../../lib/supabase'
import { generateUniqueSlug } from '../../lib/slugify'
import { cleanConditions } from '../../lib/syncConditions'
import {
  Search, CheckCircle2, User, Activity, Pill, AlertTriangle,
  ChevronDown, ChevronRight, RefreshCw, UploadCloud, FileText, X,
} from 'lucide-react'

// Matches both WhatsApp export formats:
//   iOS:     [5/13/26, 5:24:13 PM] Sender: Text   (brackets, optional seconds, optional AM/PM)
//   Android: 13/05/2026, 17:24 - Sender: Text      (dash separator)
// The timestamp-to-sender separator is a closing bracket, a dash, or both.
const MSG_REGEX = /^[\[\(]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)\s*[\]\)]?\s*(?:-\s*)?([^:]+?):\s(.+)$/i

// Small stable hash so the same message across re-exports gets the same id
function hashText(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function parseWhatsAppExport(text) {
  const lines = text.split('\n')
  const raw = []
  let current = null

  for (const line of lines) {
    const match = line.match(MSG_REGEX)
    if (match) {
      if (current) raw.push(current)
      const [, date, time, sender, firstLine] = match
      current = {
        sender: sender.trim(),
        timestamp: `${date} ${time}`,
        text: firstLine.trim(),
      }
    } else if (current && line.trim()) {
      // Continuation of a multi-line message
      current.text += '\n' + line.trim()
    }
  }
  if (current) raw.push(current)

  // Strip WhatsApp's [Forwarded] marker and build a content-stable id.
  // The id deliberately excludes the sender (the forwarder), it would otherwise
  // leak into the Claude prompt via the id and cause author misattribution.
  // timestamp + content hash is already unique per message.
  return raw.map(m => {
    const cleanText = m.text.replace(/^\[Forwarded\]\s*/i, '').trim()
    return {
      sender: m.sender,
      timestamp: m.timestamp,
      text: cleanText,
      id: `${m.timestamp}_${hashText(cleanText)}`.replace(/\s+/g, '_').replace(/[^\w\-]/g, ''),
    }
  })
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
  const confirm = useConfirm()
  const toast = useToast()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [dryRun, setDryRun] = useState(false)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [showSkipped, setShowSkipped] = useState(false)
  const [resetting, setResetting] = useState(false)
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

  async function resetSyncHistory() {
    const ok = await confirm({
      title: 'Reset import history?',
      body: 'This clears the record of which WhatsApp messages were already imported, so the next sync looks at every message again. Testimonials already in the database are not affected.',
      confirmLabel: 'Reset history',
      tone: 'danger',
    })
    if (!ok) return
    setResetting(true)
    await saveSyncedIds(new Set())
    setResetting(false)
    setResults(null)
    toast.success('Import history cleared. The next sync will look at every message again.')
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

      // 3. Enrich via Claude, in small chunks so each request stays well under
      //    the serverless time limit (~3.5s/message; 10s synchronous cap in prod).
      setStatus('enriching')
      const CHUNK_SIZE = 2
      const enriched = []

      for (let i = 0; i < newMessages.length; i += CHUNK_SIZE) {
        const chunk = newMessages.slice(i, i + CHUNK_SIZE)
        const done = Math.min(i + chunk.length, newMessages.length)
        setProgress(`Enriching ${done} of ${newMessages.length} messages with Claude...`)

        const response = await postFunction('whatsapp-import', { messages: chunk })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          if (err.error === 'rate_limit') throw new Error('Claude API rate limit reached. Please wait a moment and try again.')
          if (err.error === 'billing') throw new Error('Claude API billing issue. Check your Anthropic account.')
          if (err.error === 'overloaded') throw new Error('Claude API is overloaded. Please try again in a minute.')
          throw new Error('Enrichment failed. Please try again.')
        }

        const { results } = await response.json()
        enriched.push(...results)
      }

      // Separate testimonials from non-testimonials
      const testimonials = enriched.filter(r => r.is_testimonial)
      const notTestimonials = enriched.filter(r => !r.is_testimonial)

      // Build a reviewable list of everything that was skipped, with text
      const msgById = Object.fromEntries(newMessages.map(m => [m.id, m]))
      const stageFor = (reason) => {
        if (reason === 'voice note') return 'Voice note'
        if (reason === 'media omitted') return 'Media'
        if (reason === 'too short') return 'Too short'
        if (reason === 'system message') return 'System'
        return 'Skipped'
      }
      const skippedDetails = [
        ...preSkipped.map(s => ({
          stage: stageFor(s.reason),
          reason: s.reason,
          timestamp: s.msg.timestamp,
          text: s.msg.text,
        })),
        ...notTestimonials.map(r => {
          const orig = msgById[r.id]
          return {
            stage: 'Not a testimonial',
            reason: r.skip_reason || 'not a testimonial',
            timestamp: orig?.timestamp || '',
            text: orig?.text || '',
          }
        }),
      ]

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
          skippedDetails,
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
            conditions: cleanConditions(item.conditions || []),
            products: item.products || [],
            story_text: item.story_text || '',
            // Imports use status 'pending' + is_imported (same convention as the
            // CSV importer) so they surface under the admin "Imported Pending" tab.
            status: 'pending',
            is_imported: true,
            // The DB has no `source` column, the import origin is encoded in
            // imported_from (e.g. "whatsapp:<id>") and derived from there in the UI.
            imported_from: `whatsapp:${item.id}`,
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

      // 5. Update synced IDs. Only mark messages we've truly dealt with:
      //    successfully-saved testimonials + non-testimonials (chat noise).
      //    Failed inserts are deliberately NOT marked, so they retry next run.
      const savedIds = saved.map(it => it.id)
      const noiseIds = notTestimonials.map(r => r.id)
      const allProcessedIds = [...syncedIds, ...savedIds, ...noiseIds]
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
        skippedDetails,
      })

    } catch (err) {
      setStatus('error')
      setError(friendlyError(err, 'The sync could not finish.'))
    }
  }

  const isBusy = ['parsing', 'checking', 'enriching', 'saving'].includes(status)
  const lastSynced = settings.whatsapp_last_synced
    ? new Date(settings.whatsapp_last_synced).toLocaleString('en-ZA')
    : 'Never'

  return (
    <div className="admin-page-content whatsapp-sync-page">
      <div className="page-header">
        <h1>WhatsApp Sync</h1>
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
        <div className="wa-setting wa-setting--action">
          <label>Import History</label>
          <button type="button" className="btn-outline-danger" onClick={resetSyncHistory} disabled={resetting}>
            {resetting ? 'Resetting…' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Import panel card: instructions, file, options and the action grouped together */}
      <div className="search-panel wa-import-panel">
      {/* How to export instructions */}
      <div className="wa-howto">
        <h2 className="wa-howto-title">How to export from WhatsApp</h2>
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
        role="button"
        tabIndex={isBusy ? -1 : 0}
        aria-label={file ? `Selected file ${file.name}. Choose a different file` : 'Choose a WhatsApp export .txt file'}
        onClick={() => !isBusy && fileRef.current?.click()}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !isBusy && e.target === e.currentTarget) { e.preventDefault(); fileRef.current?.click() } }}
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
          tabIndex={-1}
          aria-hidden="true"
          style={{ display: 'none' }}
        />
        {file ? (
          <div className="wa-file-selected">
            <FileText size={22} aria-hidden="true" />
            <span>{file.name}</span>
            <button
              type="button"
              className="wa-remove-file"
              aria-label="Remove file"
              onClick={e => { e.stopPropagation(); setFile(null); setResults(null); setError('') }}
            ><X size={16} aria-hidden="true" /></button>
          </div>
        ) : (
          <div className="wa-upload-prompt">
            <UploadCloud size={32} aria-hidden="true" />
            <strong>Drag the WhatsApp export here or click to browse</strong>
            <p>.txt chat export, without media</p>
          </div>
        )}
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Controls */}
      <div className="wa-controls">
        <label className="wa-dry-run-toggle">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={e => setDryRun(e.target.checked)}
            disabled={isBusy}
          />
          <span>Dry run: preview without saving</span>
        </label>

        <button
          type="button"
          className="btn-primary"
          onClick={handleSync}
          disabled={!file || isBusy}
        >
          {isBusy ? (
            <><span className="wa-spinner" /> {STATUS_LABELS[status]}</>
          ) : (
            <>
              <RefreshCw size={18} aria-hidden="true" />
              {dryRun ? 'Preview Import' : 'Sync Now'}
            </>
          )}
        </button>
      </div>

      </div>

      {/* Progress */}
      {isBusy && progress && (
        <div className="wa-progress">{progress}</div>
      )}

      {/* Results */}
      {results && status === 'done' && (
        <div className="wa-results">
          <h3 className="wa-results-title">
            {results.dryRun
              ? <><Search size={18} /> Dry Run Preview</>
              : <><CheckCircle2 size={18} /> Sync Complete</>}
          </h3>

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
              <Link to="/admin/all?status=imported_pending">All Testimonials, Imported Pending</Link>.
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
                    {item.person_name && <span><User size={13} /> {item.person_name}</span>}
                    {item.conditions?.length > 0 && <span><Activity size={13} /> {item.conditions.join(', ')}</span>}
                    {item.products?.length > 0 && <span><Pill size={13} /> {item.products.join(', ')}</span>}
                  </div>
                  {item.review_notes && (
                    <div className="wa-detail-flag"><AlertTriangle size={13} /> {item.review_notes}</div>
                  )}
                  <div className="wa-detail-excerpt">
                    {storyExcerpt(item.story_text, 200)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skipped messages, collapsible, for double-checking */}
          {results.skippedDetails?.length > 0 && (
            <div className="wa-skipped-section">
              <button
                type="button"
                className="wa-skipped-toggle"
                aria-expanded={showSkipped}
                onClick={() => setShowSkipped(v => !v)}
              >
                {showSkipped ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                Review {results.skippedDetails.length} skipped message{results.skippedDetails.length !== 1 ? 's' : ''}
              </button>
              {showSkipped && (
                <div className="wa-skipped-list">
                  {results.skippedDetails.map((s, i) => (
                    <div key={i} className="wa-skipped-item">
                      <div className="wa-skipped-head">
                        <span className={`wa-skipped-tag wa-skipped-tag--${s.stage.toLowerCase().replace(/\s+/g, '-')}`}>{s.stage}</span>
                        {s.timestamp && <span className="wa-skipped-time">{s.timestamp}</span>}
                        {s.reason && s.reason !== s.stage.toLowerCase() && <span className="wa-skipped-reason">{s.reason}</span>}
                      </div>
                      <div className="wa-skipped-text">
                        {s.text?.slice(0, 220) || <em>(no text)</em>}{s.text?.length > 220 ? '…' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
