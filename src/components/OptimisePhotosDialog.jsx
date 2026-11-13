import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useDialog } from '../lib/useDialog'
import { optimiseImage } from '../lib/imageTools'
import Alert from './Alert'

// Image Manager "Optimise photos": shrink the gallery photos testimonials
// already use to the same WebP the uploads now get (lib/imageTools.js).
// Step 1 checks every photo in the browser and writes nothing. Step 2 runs
// only after the admin confirms: per photo it uploads the smaller copy, points
// every testimonial that uses it at the new copy, then deletes the original.
//
// images: Image Manager rows ({ path, url, size, folder, orphan })

const BUCKET = 'testimonial-images'
const MIN_SAVING = 0.25   // only replace a photo when it gets at least 25% smaller

const mb = bytes => `${(bytes / 1048576).toFixed(1)} MB`

export default function OptimisePhotosDialog({ images, onClose }) {
    const [phase, setPhase] = useState('intro')   // intro, checking, ready, running, done
    const [progress, setProgress] = useState({ n: 0, of: 0 })
    const [plan, setPlan] = useState(null)        // { items, checked, skipped, failed }
    const [result, setResult] = useState(null)    // { done, failed, saved }
    const stopRef = useRef(false)
    const busy = phase === 'checking' || phase === 'running'
    const dialogRef = useDialog(true, () => { if (!busy) onClose(phase === 'done') })

    // Photos in use by a testimonial, not WebP yet
    const candidates = images.filter(i => i.folder === 'gallery' && !i.orphan && !/\.webp$/i.test(i.path))

    async function check() {
        stopRef.current = false
        setPhase('checking')
        setProgress({ n: 0, of: candidates.length })
        const items = []
        let failed = 0, checked = 0, next = 0
        // Four at a time: downloads overlap with the canvas work
        async function worker() {
            while (next < candidates.length && !stopRef.current) {
                const img = candidates[next++]
                try {
                    const blob = await (await fetch(img.url)).blob()
                    const original = new File([blob], img.path.split('/').pop(), { type: blob.type })
                    const smaller = await optimiseImage(original)
                    if (smaller !== original && smaller.size <= blob.size * (1 - MIN_SAVING)) {
                        items.push({ img, file: smaller, before: blob.size, after: smaller.size })
                    }
                } catch {
                    failed++
                }
                checked++
                setProgress({ n: checked, of: candidates.length })
            }
        }
        await Promise.all([worker(), worker(), worker(), worker()])
        setPlan({ items, checked, failed, stopped: stopRef.current })
        setPhase('ready')
    }

    async function run() {
        stopRef.current = false
        setPhase('running')
        const items = plan.items
        setProgress({ n: 0, of: items.length })
        let done = 0, failed = 0, saved = 0
        for (let i = 0; i < items.length; i++) {
            if (stopRef.current) break
            const { img, file, before, after } = items[i]
            const newPath = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
            try {
                const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, file)
                if (upErr) throw upErr
                const newUrl = supabase.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl

                // Every testimonial using the photo moves to the new copy
                const { data: rows, error: selErr } = await supabase.from('testimonials').select('id, gallery_urls').contains('gallery_urls', [img.url])
                if (selErr) throw selErr
                for (const row of rows || []) {
                    const { error } = await supabase.from('testimonials')
                        .update({ gallery_urls: row.gallery_urls.map(u => u === img.url ? newUrl : u) })
                        .eq('id', row.id)
                    if (error) {
                        // Leave this photo as it was: drop the new copy, keep the original
                        await supabase.storage.from(BUCKET).remove([newPath])
                        throw error
                    }
                }
                // The original is no longer used anywhere
                await supabase.storage.from(BUCKET).remove([img.path])
                done++
                saved += before - after
            } catch (err) {
                console.error('Optimise photo failed', img.path, err)
                failed++
            }
            setProgress({ n: i + 1, of: items.length })
        }
        setResult({ done, failed, saved, stopped: stopRef.current })
        setPhase('done')
    }

    const totalBefore = plan ? plan.items.reduce((s, x) => s + x.before, 0) : 0
    const totalAfter = plan ? plan.items.reduce((s, x) => s + x.after, 0) : 0

    return (
        <div className="modal-backdrop">
            <div className="modal optimise-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="optimise-title">
                <h3 id="optimise-title">Optimise photos</h3>

                {phase === 'intro' && <>
                    <p>
                        Makes the {candidates.length} gallery photos that testimonials use smaller: at most 2000px on the
                        long side and saved as WebP, like new uploads. First it checks every photo and shows what it would
                        save. Nothing changes until you confirm.
                    </p>
                    <p>A photo is only replaced when it gets at least a quarter smaller.</p>
                </>}

                {busy && (
                    <div aria-live="polite">
                        <p>{phase === 'checking' ? 'Checking' : 'Optimising'} photo {progress.n} of {progress.of}…</p>
                        <progress className="optimise-progress" value={progress.n} max={progress.of || 1} />
                        <p className="settings-hint">Keep this tab open until it finishes.</p>
                    </div>
                )}

                {phase === 'ready' && plan && (
                    plan.items.length === 0 ? (
                        <Alert type="success">
                            All {plan.checked} photos are already small. Nothing to optimise.
                            {plan.failed > 0 && ` ${plan.failed} could not be read and were left alone.`}
                        </Alert>
                    ) : <>
                        <p>
                            <strong>{plan.items.length} of {plan.checked} photos</strong> can be made smaller:
                            {' '}{mb(totalBefore)} becomes {mb(totalAfter)}, saving <strong>{mb(totalBefore - totalAfter)}</strong>.
                            The rest are already small and stay as they are.
                            {plan.stopped && ' (Checking was stopped early, so only the photos checked are included.)'}
                            {plan.failed > 0 && ` ${plan.failed} could not be read and will be left alone.`}
                        </p>
                        <Alert type="warning">
                            Each original is deleted once its smaller copy is in place. This cannot be undone.
                        </Alert>
                    </>
                )}

                {phase === 'done' && result && (
                    <Alert type={result.failed ? 'warning' : 'success'}>
                        Optimised {result.done} photo{result.done !== 1 ? 's' : ''}, saving {mb(result.saved)}.
                        {result.failed > 0 && ` ${result.failed} failed and were left as they were.`}
                        {result.stopped && ' Stopped early; the rest were not changed.'}
                    </Alert>
                )}

                <div className="modal-ft">
                    {busy ? (
                        <button type="button" className="btn-secondary" onClick={() => { stopRef.current = true }}>Stop</button>
                    ) : (
                        <button type="button" className="btn-secondary" data-autofocus onClick={() => onClose(phase === 'done')}>
                            {phase === 'done' ? 'Close' : 'Cancel'}
                        </button>
                    )}
                    {phase === 'intro' && (
                        <button type="button" className="btn-primary" onClick={check} disabled={!candidates.length}>Check photos</button>
                    )}
                    {phase === 'ready' && plan?.items.length > 0 && (
                        <button type="button" className="btn-danger" onClick={run}>
                            Optimise {plan.items.length} photos
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
