import { useState, useEffect, useCallback } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2, Plus, LayoutGrid, Undo2, X, ChevronDown, Maximize2, Minimize2, Spline } from 'lucide-react'
import PerspectivePins from './PerspectivePins'
import { useDialog } from '../lib/useDialog'
import Alert from './Alert'
import {
    loadImage, renderGeometry, cropCanvas, applyAdjustments, canvasToFile, detectCollageTiles,
    cssFilter, sharpenStrength, NO_ADJUST, MAX_EDGE, levelsTable, histogram, autoLevels, hasLevels,
    quadSize, warpPerspective,
} from '../lib/imageTools'

// Photo editor (Add and Edit Testimonial galleries): crop, rotate, flip,
// straighten, perspective fix (corner pins), Levels, brightness, contrast,
// saturation and sharpen, saved as an
// optimised WebP. Collages can be split into separate photos, either by
// "Split collage" (finds the gaps) or one crop at a time ("Add as new photo").
//
// onReplace(file)  the edited photo replaces the one being edited
// onAdd(files)     extra photos to add to the gallery (collage pieces)
// onClose({ removeOriginal })

const SHAPES = [
    { label: 'Free', aspect: null },
    { label: 'Square', aspect: 1 },
    { label: '4:3', aspect: 4 / 3 },
    { label: '3:4', aspect: 3 / 4 },
    { label: '16:9', aspect: 16 / 9 },
]

const SLIDERS = [
    { key: 'brightness', label: 'Brightness', min: 50, max: 150 },
    { key: 'contrast', label: 'Contrast', min: 50, max: 150 },
    { key: 'saturation', label: 'Saturation', min: 0, max: 200 },
    { key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
]

const FULL = { unit: '%', x: 0, y: 0, width: 100, height: 100 }
const PREVIEW_EDGE = 1400   // the on-screen copy; the saved photo uses the full image
const SOURCE_EDGE = 6000    // cap on the working copy, keeps memory sane on huge scans
const SHARPEN_ID = 'image-editor-sharpen'
const LEVELS_ID = 'image-editor-levels'

// Perspective fix: pins start a little inside the corners; the shape of the
// straightened result is guessed from the pins unless one is chosen
const START_PINS = [[10, 10], [90, 10], [90, 90], [10, 90]]
const PIN_SHAPES = [
    { label: 'Auto', aspect: null },
    { label: '4:3', aspect: 4 / 3 },
    { label: '3:4', aspect: 3 / 4 },
    { label: 'Square', aspect: 1 },
]
const WARP_SOURCE_EDGE = 4000   // detail the warp reads from
const WARP_OUT_EDGE = 2400      // largest straightened photo (saved photos cap at 2000)

const FULL_KEY = 'image_editor_full'
function readFull() {
    try { return localStorage.getItem(FULL_KEY) === '1' } catch { return false }
}

// Which tool sections are open is remembered in this browser (a convenience,
// so it may come back empty)
const SECTIONS_KEY = 'image_editor_sections'
function readSections() {
    try { return { levels: false, adjust: false, ...JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}') } }
    catch { return { levels: false, adjust: false } }
}

// A tool section with a heading that opens and closes it. `changed` shows a
// dot so edits inside a closed section are not missed; `extra` sits on the
// right of the heading (Levels puts Auto there so it works while closed).
function Section({ id, title, open, onToggle, changed, extra, children }) {
    return (
        <div className="image-editor-group image-editor-section">
            <div className="image-editor-section-hd">
                <button type="button" className="image-editor-toggle" aria-expanded={open} aria-controls={id} onClick={onToggle}>
                    <ChevronDown size={16} aria-hidden="true" className="chev" />
                    <span className="edit-label">{title}</span>
                    {changed && <span className="image-editor-changed" title="Changed"><span className="sr-only">(changed)</span></span>}
                </button>
                {extra}
            </div>
            <div id={id} hidden={!open}>{children}</div>
        </div>
    )
}

// Histogram as an SVG path, 256 wide by 60 high (square-root scale so the
// quieter tones still show)
function histogramPath(bins) {
    const peak = Math.sqrt(Math.max(...bins, 1))
    let dPath = 'M0 60'
    bins.forEach((n, i) => { dPath += ` L${i} ${(60 - (Math.sqrt(n) / peak) * 58).toFixed(1)}` })
    return dPath + ' L255 60 Z'
}

export default function ImageEditor({ src, onReplace, onAdd, onClose }) {
    const [img, setImg] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [quarter, setQuarter] = useState(0)        // 0..3, times 90 degrees
    const [straighten, setStraighten] = useState(0)  // -15..15 degrees
    const [flipH, setFlipH] = useState(false)
    const [flipV, setFlipV] = useState(false)
    const [aspect, setAspect] = useState(null)
    const [crop, setCrop] = useState(FULL)
    const [adjust, setAdjust] = useState(NO_ADJUST)
    const [preview, setPreview] = useState(null)     // { url, width, height }
    const [hist, setHist] = useState(null)           // 256 brightness bins of the photo
    const [busy, setBusy] = useState('')
    const [added, setAdded] = useState(0)
    const [removeOriginal, setRemoveOriginal] = useState(true)
    const [message, setMessage] = useState(null)     // { type, text }
    const [sections, setSections] = useState(readSections)
    const [pinMode, setPinMode] = useState(false)
    const [pins, setPins] = useState(START_PINS)
    const [pinAspect, setPinAspect] = useState(null)
    const [history, setHistory] = useState([])        // states before each perspective fix, for Undo
    const [full, setFull] = useState(readFull)
    const toggleFull = () => setFull(f => {
        try { localStorage.setItem(FULL_KEY, f ? '0' : '1') } catch { /* private mode */ }
        return !f
    })
    const toggleSection = key => setSections(prev => {
        const next = { ...prev, [key]: !prev[key] }
        try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(next)) } catch { /* private mode */ }
        return next
    })

    const close = useCallback(() => {
        if (!busy) onClose({ removeOriginal: added > 0 && removeOriginal })
    }, [busy, onClose, added, removeOriginal])
    const dialogRef = useDialog(true, close)

    const geometry = { rotation: quarter * 90 + straighten, flipH, flipV }

    useEffect(() => {
        let alive = true
        loadImage(src)
            .then(i => { if (alive) setImg(i) })
            .catch(() => { if (alive) setLoadError('This photo could not be opened for editing.') })
        return () => { alive = false }
    }, [src])

    // Redraw the on-screen copy when the geometry changes
    useEffect(() => {
        if (!img) return
        let url
        const canvas = renderGeometry(img, geometry, PREVIEW_EDGE)
        setHist(histogram(canvas))
        canvas.toBlob(blob => {
            url = URL.createObjectURL(blob)
            setPreview({ url, width: canvas.width, height: canvas.height })
        }, 'image/jpeg', 0.92)
        return () => { if (url) URL.revokeObjectURL(url) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [img, quarter, straighten, flipH, flipV])

    function resetCrop(nextAspect = aspect, size = preview) {
        if (!nextAspect || !size) { setCrop(FULL); return }
        setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, nextAspect, size.width, size.height), size.width, size.height))
    }

    function turn(dir) { setQuarter(q => (q + dir + 4) % 4); setCrop(FULL); setAspect(null) }
    function flip(axis) { (axis === 'h' ? setFlipH : setFlipV)(v => !v); setCrop(FULL); setAspect(null) }
    function chooseShape(a) { setAspect(a); resetCrop(a) }

    // Perspective fix: the straightened photo becomes the one being edited, so
    // rotation and flips (already applied to it) start again from zero
    const applyPerspective = () => run('Straightening…', async () => {
        const source = renderGeometry(img, geometry, WARP_SOURCE_EDGE)
        const quad = pins.map(([x, y]) => [(x / 100) * source.width, (y / 100) * source.height])
        const out = warpPerspective(source, quad, quadSize(quad, pinAspect), WARP_OUT_EDGE)
        setHistory(h => [...h, { img, quarter, straighten, flipH, flipV }])
        setImg(out)
        setQuarter(0); setStraighten(0); setFlipH(false); setFlipV(false)
        setCrop(FULL); setAspect(null)
        setPinMode(false)
        setMessage({ type: 'success', text: 'Straightened. Crop or adjust it further, or use Undo perspective.' })
    })

    function undoPerspective() {
        const last = history[history.length - 1]
        if (!last) return
        setHistory(h => h.slice(0, -1))
        setImg(last.img)
        setQuarter(last.quarter); setStraighten(last.straighten); setFlipH(last.flipH); setFlipV(last.flipV)
        setCrop(FULL); setAspect(null); setMessage(null)
    }

    function startPins() {
        setPins(START_PINS); setPinAspect(null); setPinMode(true); setMessage(null)
    }

    function resetAll() {
        if (history.length) { setImg(history[0].img); setHistory([]) }
        setPinMode(false)
        setQuarter(0); setStraighten(0); setFlipH(false); setFlipV(false)
        setAspect(null); setCrop(FULL); setAdjust(NO_ADJUST); setMessage(null)
    }

    // Full-resolution render of one crop with the current settings
    async function exportCrop(source, c) {
        const out = applyAdjustments(cropCanvas(source, c, MAX_EDGE), adjust)
        return canvasToFile(out, 'photo')
    }

    async function run(label, fn) {
        setBusy(label)
        setMessage(null)
        // Let the busy state paint before the canvas work blocks the thread
        await new Promise(r => setTimeout(r, 30))
        try { await fn() }
        catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: 'The photo could not be processed. Try again, or use a smaller image.' })
        } finally { setBusy('') }
    }

    const handleSave = () => run('Saving…', async () => {
        const file = await exportCrop(renderGeometry(img, geometry, SOURCE_EDGE), crop)
        onReplace(file)
    })

    const handleAddCrop = () => run('Adding…', async () => {
        const file = await exportCrop(renderGeometry(img, geometry, SOURCE_EDGE), crop)
        onAdd([file])
        setAdded(n => n + 1)
        setMessage({ type: 'success', text: 'Added to the gallery. Draw a box around the next photo, or click Done.' })
    })

    const handleSplit = () => run('Splitting…', async () => {
        const source = renderGeometry(img, geometry, SOURCE_EDGE)
        const tiles = detectCollageTiles(source)
        if (tiles.length < 2) {
            setMessage({ type: 'warning', text: 'No clear gaps between photos were found. Draw a box around each photo and use Add as new photo.' })
            return
        }
        const files = []
        for (const t of tiles) files.push(await exportCrop(source, t))
        onAdd(files)
        setAdded(n => n + files.length)
        setMessage({ type: 'success', text: `${files.length} photos added to the gallery. Check them, then click Done.` })
    })

    const k = sharpenStrength(adjust.sharpen)
    const levelsValues = Array.from(levelsTable(adjust), v => (v / 255).toFixed(4)).join(' ')
    const setLevel = (key, value) => setAdjust(a => {
        const next = { ...a, [key]: value }
        // Keep black below white with a small gap
        if (key === 'levelsBlack') next.levelsBlack = Math.min(value, a.levelsWhite - 2)
        if (key === 'levelsWhite') next.levelsWhite = Math.max(value, a.levelsBlack + 2)
        return next
    })
    const ready = img && preview && !busy
    const toolsReady = ready && !pinMode

    return (
        <div className={`modal-backdrop ${full ? 'image-editor-backdrop--full' : ''}`}>
            <div className={`modal image-editor ${full ? 'image-editor--full' : ''}`} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="image-editor-title">
                <div className="image-editor-hd">
                    <h3 id="image-editor-title" className="modal-title">Edit photo</h3>
                    <button
                        type="button"
                        className="image-editor-close image-editor-full-btn"
                        onClick={toggleFull}
                        aria-pressed={full}
                        aria-label={full ? 'Exit full screen' : 'Full screen'}
                        title={full ? 'Exit full screen' : 'Full screen'}
                    >
                        {full ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
                    </button>
                    <button type="button" className="image-editor-close" onClick={close} disabled={!!busy} aria-label="Close the photo editor" title="Close">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {/* Same kernel and Levels table as the saved photo (lib/imageTools.js).
                    sRGB so the filters work on the same values as the canvas. */}
                <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
                    <filter id={LEVELS_ID} colorInterpolationFilters="sRGB">
                        <feComponentTransfer>
                            <feFuncR type="table" tableValues={levelsValues} />
                            <feFuncG type="table" tableValues={levelsValues} />
                            <feFuncB type="table" tableValues={levelsValues} />
                        </feComponentTransfer>
                    </filter>
                    <filter id={SHARPEN_ID} colorInterpolationFilters="sRGB">
                        <feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix={`0 ${-k} 0 ${-k} ${1 + 4 * k} ${-k} 0 ${-k} 0`} />
                    </filter>
                </svg>

                <div className="image-editor-body">
                    <div className="image-editor-stage">
                        {loadError && <p className="image-editor-empty">{loadError}</p>}
                        {!loadError && !preview && <p className="image-editor-empty">Loading photo…</p>}
                        {preview && pinMode && (
                            <PerspectivePins
                                src={preview.url}
                                filter={cssFilter(adjust, SHARPEN_ID, LEVELS_ID)}
                                pins={pins}
                                onChange={setPins}
                            />
                        )}
                        {preview && !pinMode && (
                            <ReactCrop
                                crop={crop}
                                aspect={aspect || undefined}
                                onChange={(_, pct) => setCrop(pct)}
                                keepSelection
                                ruleOfThirds
                                disabled={!!busy}
                            >
                                <img
                                    src={preview.url}
                                    alt="Photo being edited"
                                    style={{ filter: cssFilter(adjust, SHARPEN_ID, LEVELS_ID) }}
                                />
                            </ReactCrop>
                        )}
                    </div>

                    <div className="image-editor-tools">
                        <div className="image-editor-group">
                            <span className="edit-label">Crop shape</span>
                            <div className="image-editor-chips" role="group" aria-label="Crop shape">
                                {SHAPES.map(s => (
                                    <button
                                        key={s.label}
                                        type="button"
                                        className={`image-editor-chip ${aspect === s.aspect ? 'active' : ''}`}
                                        aria-pressed={aspect === s.aspect}
                                        onClick={() => chooseShape(s.aspect)}
                                        disabled={!toolsReady}
                                    >{s.label}</button>
                                ))}
                            </div>
                        </div>

                        <div className="image-editor-group">
                            <span className="edit-label">Rotate and flip</span>
                            <div className="image-editor-chips">
                                <button type="button" className="image-editor-icon" onClick={() => turn(-1)} disabled={!toolsReady} aria-label="Rotate left" title="Rotate left"><RotateCcw size={18} aria-hidden="true" /></button>
                                <button type="button" className="image-editor-icon" onClick={() => turn(1)} disabled={!toolsReady} aria-label="Rotate right" title="Rotate right"><RotateCw size={18} aria-hidden="true" /></button>
                                <button type="button" className={`image-editor-icon ${flipH ? 'active' : ''}`} aria-pressed={flipH} onClick={() => flip('h')} disabled={!toolsReady} aria-label="Flip horizontally" title="Flip horizontally"><FlipHorizontal2 size={18} aria-hidden="true" /></button>
                                <button type="button" className={`image-editor-icon ${flipV ? 'active' : ''}`} aria-pressed={flipV} onClick={() => flip('v')} disabled={!toolsReady} aria-label="Flip vertically" title="Flip vertically"><FlipVertical2 size={18} aria-hidden="true" /></button>
                            </div>
                            <label className="image-editor-slider">
                                <span>Straighten <output>{straighten > 0 ? '+' : ''}{straighten}°</output></span>
                                <input type="range" min={-15} max={15} step={0.5} value={straighten} onChange={e => setStraighten(Number(e.target.value))} disabled={!toolsReady} />
                            </label>
                            {!pinMode ? (
                                <div className="image-editor-chips image-editor-persp">
                                    <button type="button" className="btn-secondary btn-sm" onClick={startPins} disabled={!toolsReady}>
                                        <Spline size={16} aria-hidden="true" /> Fix perspective
                                    </button>
                                    {history.length > 0 && (
                                        <button type="button" className="btn-ghost btn-sm" onClick={undoPerspective} disabled={!toolsReady}>
                                            <Undo2 size={16} aria-hidden="true" /> Undo perspective
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="image-editor-pinpanel" role="group" aria-label="Fix perspective">
                                    <p className="settings-hint">Drag the four pins onto the corners of what should be a rectangle, such as a printed photo or a page. Apply straightens it.</p>
                                    <span className="image-editor-sub">Shape</span>
                                    <div className="image-editor-chips" role="group" aria-label="Shape of the straightened photo">
                                        {PIN_SHAPES.map(sh => (
                                            <button
                                                key={sh.label}
                                                type="button"
                                                className={`image-editor-chip ${pinAspect === sh.aspect ? 'active' : ''}`}
                                                aria-pressed={pinAspect === sh.aspect}
                                                onClick={() => setPinAspect(sh.aspect)}
                                                disabled={!!busy}
                                            >{sh.label}</button>
                                        ))}
                                    </div>
                                    <div className="image-editor-chips">
                                        <button type="button" className="btn-primary btn-sm" onClick={applyPerspective} disabled={!ready}>{busy === 'Straightening…' ? busy : 'Apply'}</button>
                                        <button type="button" className="btn-secondary btn-sm" onClick={() => setPinMode(false)} disabled={!!busy}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Section
                            id="image-editor-levels-body"
                            title="Levels"
                            open={sections.levels}
                            onToggle={() => toggleSection('levels')}
                            changed={hasLevels(adjust)}
                            extra={<button type="button" className="image-editor-chip" onClick={() => hist && setAdjust(a => ({ ...a, ...autoLevels(hist) }))} disabled={!toolsReady || !hist}>Auto</button>}
                        >
                            {hist && (
                                <svg className="image-editor-hist" viewBox="0 0 256 60" preserveAspectRatio="none" role="img" aria-label="Histogram of the photo's tones, dark on the left, light on the right">
                                    <path d={histogramPath(hist)} />
                                    <line x1={adjust.levelsBlack} x2={adjust.levelsBlack} y1="0" y2="60" className="black" />
                                    <line x1={adjust.levelsWhite} x2={adjust.levelsWhite} y1="0" y2="60" className="white" />
                                </svg>
                            )}
                            <label className="image-editor-slider">
                                <span>Black point <output>{adjust.levelsBlack}</output></span>
                                <input type="range" min={0} max={253} step={1} value={adjust.levelsBlack} onChange={e => setLevel('levelsBlack', Number(e.target.value))} disabled={!toolsReady} />
                            </label>
                            <label className="image-editor-slider">
                                <span>Midtones <output>{adjust.levelsMid.toFixed(2)}</output></span>
                                <input type="range" min={0.3} max={3} step={0.01} value={adjust.levelsMid} onChange={e => setLevel('levelsMid', Number(e.target.value))} disabled={!toolsReady} />
                            </label>
                            <label className="image-editor-slider">
                                <span>White point <output>{adjust.levelsWhite}</output></span>
                                <input type="range" min={2} max={255} step={1} value={adjust.levelsWhite} onChange={e => setLevel('levelsWhite', Number(e.target.value))} disabled={!toolsReady} />
                            </label>
                        </Section>

                        <Section
                            id="image-editor-adjust-body"
                            title="Adjust"
                            open={sections.adjust}
                            onToggle={() => toggleSection('adjust')}
                            changed={adjust.brightness !== 100 || adjust.contrast !== 100 || adjust.saturation !== 100 || adjust.sharpen > 0}
                        >
                            {SLIDERS.map(s => (
                                <label key={s.key} className="image-editor-slider">
                                    <span>{s.label} <output>{s.key === 'sharpen' ? adjust[s.key] : adjust[s.key] - 100 > 0 ? `+${adjust[s.key] - 100}` : adjust[s.key] - 100}</output></span>
                                    <input
                                        type="range" min={s.min} max={s.max} step={1}
                                        value={adjust[s.key]}
                                        onChange={e => setAdjust(a => ({ ...a, [s.key]: Number(e.target.value) }))}
                                        disabled={!toolsReady}
                                    />
                                </label>
                            ))}
                        </Section>

                        <div className="image-editor-group">
                            <span className="edit-label">Collage</span>
                            <div className="image-editor-chips">
                                <button type="button" className="btn-secondary" onClick={handleSplit} disabled={!toolsReady}>
                                    <LayoutGrid size={16} aria-hidden="true" /> Split collage
                                </button>
                                <button type="button" className="btn-secondary" onClick={handleAddCrop} disabled={!toolsReady}>
                                    <Plus size={16} aria-hidden="true" /> Add as new photo
                                </button>
                            </div>
                            <p className="settings-hint">Split collage finds the gaps between the photos and adds each one. Or draw a box and use Add as new photo.</p>
                        </div>

                        <button type="button" className="btn-ghost image-editor-reset" onClick={resetAll} disabled={!toolsReady}>
                            <Undo2 size={16} aria-hidden="true" /> Reset all
                        </button>
                    </div>
                </div>

                <div aria-live="polite">
                    {message && <Alert type={message.type} onClose={() => setMessage(null)}>{message.text}</Alert>}
                </div>

                <div className="modal-ft image-editor-ft">
                    {added > 0 && (
                        <label className="edit-checkbox-label image-editor-remove">
                            <input type="checkbox" checked={removeOriginal} onChange={e => setRemoveOriginal(e.target.checked)} />
                            Remove the original photo when I click Done
                        </label>
                    )}
                    {busy && busy !== 'Saving…' && <span className="settings-hint image-editor-busy">{busy}</span>}
                    <button type="button" className="btn-secondary" data-autofocus onClick={close} disabled={!!busy}>
                        {added > 0 ? 'Done' : 'Cancel'}
                    </button>
                    {added === 0 && (
                        <button type="button" className="btn-primary" onClick={handleSave} disabled={!toolsReady}>
                            {busy === 'Saving…' ? busy : 'Save photo'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
