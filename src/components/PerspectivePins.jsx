import { useRef, useState, useEffect } from 'react'

// Four draggable corner pins over the photo for the perspective fix
// (ImageEditor). Pins are in % of the photo: [x, y], in the order top-left,
// top-right, bottom-right, bottom-left. While a pin is dragged, a loupe shows
// the area under it magnified so it can be placed on the exact corner.
// Keyboard: focus a pin and use the arrow keys (Shift for bigger steps).

const NAMES = ['Top-left', 'Top-right', 'Bottom-right', 'Bottom-left']
const LOUPE = 132     // px
const ZOOM = 3

const clamp = v => Math.min(100, Math.max(0, v))

export default function PerspectivePins({ src, filter, pins, onChange }) {
    const wrapRef = useRef(null)
    const imgRef = useRef(null)
    const loupeRef = useRef(null)
    const [dragging, setDragging] = useState(null)   // pin index

    function pointToPct(e) {
        const r = wrapRef.current.getBoundingClientRect()
        return [clamp(((e.clientX - r.left) / r.width) * 100), clamp(((e.clientY - r.top) / r.height) * 100)]
    }

    function move(i, point) {
        onChange(pins.map((p, j) => (j === i ? point : p)))
    }

    function onPointerDown(i, e) {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        e.currentTarget.focus()
        setDragging(i)
    }
    function onPointerMove(i, e) {
        if (dragging === i) move(i, pointToPct(e))
    }
    function onPointerUp() { setDragging(null) }

    function onKeyDown(i, e) {
        const step = e.shiftKey ? 2 : 0.25
        const [x, y] = pins[i]
        const next = { ArrowLeft: [x - step, y], ArrowRight: [x + step, y], ArrowUp: [x, y - step], ArrowDown: [x, y + step] }[e.key]
        if (next) { e.preventDefault(); move(i, next.map(clamp)) }
    }

    // Draw the loupe: the photo around the dragged pin, magnified, with a cross
    useEffect(() => {
        if (dragging === null) return
        const canvas = loupeRef.current, img = imgRef.current
        if (!canvas || !img?.naturalWidth) return
        const ctx = canvas.getContext('2d')
        const [px, py] = pins[dragging]
        const sx = (px / 100) * img.naturalWidth
        const sy = (py / 100) * img.naturalHeight
        // Source window so the loupe shows ZOOM x the on-screen size
        const shownScale = img.naturalWidth / img.getBoundingClientRect().width
        const half = (LOUPE / ZOOM / 2) * shownScale
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(0, 0, LOUPE, LOUPE)
        ctx.filter = filter || 'none'
        ctx.drawImage(img, sx - half, sy - half, half * 2, half * 2, 0, 0, LOUPE, LOUPE)
        ctx.filter = 'none'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(LOUPE / 2, 0); ctx.lineTo(LOUPE / 2, LOUPE)
        ctx.moveTo(0, LOUPE / 2); ctx.lineTo(LOUPE, LOUPE / 2)
        ctx.stroke()
    }, [dragging, pins, filter])

    // Keep the loupe away from the pin: opposite top corner
    const loupeLeft = dragging !== null && pins[dragging][0] < 50

    return (
        <div className="pp-wrap" ref={wrapRef}>
            <img ref={imgRef} src={src} alt="Photo being straightened" style={{ filter }} draggable={false} />
            <svg className="pp-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polygon points={pins.map(p => p.join(',')).join(' ')} />
            </svg>
            {pins.map((p, i) => (
                <button
                    key={i}
                    type="button"
                    className={`pp-pin ${dragging === i ? 'dragging' : ''}`}
                    style={{ left: `${p[0]}%`, top: `${p[1]}%` }}
                    aria-label={`${NAMES[i]} corner pin. Drag it, or use the arrow keys, onto the corner.`}
                    onPointerDown={e => onPointerDown(i, e)}
                    onPointerMove={e => onPointerMove(i, e)}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onKeyDown={e => onKeyDown(i, e)}
                ><span /></button>
            ))}
            {dragging !== null && (
                <canvas
                    ref={loupeRef}
                    className={`pp-loupe ${loupeLeft ? 'right' : 'left'}`}
                    width={LOUPE}
                    height={LOUPE}
                    aria-hidden="true"
                />
            )}
        </div>
    )
}
