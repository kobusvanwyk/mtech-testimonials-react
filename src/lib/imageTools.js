// Image helpers for uploads and the photo editor: load, rotate/flip, crop,
// adjust (brightness, contrast, saturation, sharpen) and export as an
// optimised WebP. Everything runs in the browser on a canvas.

export const MAX_EDGE = 2000      // long edge of a saved photo, in px
export const WEBP_QUALITY = 0.82

// Types we can decode and re-encode. GIF (animation) and SVG are left alone.
const OPTIMISABLE = /^image\/(jpeg|png|webp|bmp)$/

// Load an image from a URL, a blob: URL or a File. crossOrigin lets saved
// Supabase photos be drawn to a canvas and exported again.
export function loadImage(src) {
    const url = src instanceof Blob ? URL.createObjectURL(src) : src
    return new Promise((resolve, reject) => {
        const img = new Image()
        if (!(src instanceof Blob) && !url.startsWith('blob:') && !url.startsWith('data:')) img.crossOrigin = 'anonymous'
        img.onload = () => {
            if (src instanceof Blob) URL.revokeObjectURL(url)
            resolve(img)
        }
        img.onerror = () => {
            if (src instanceof Blob) URL.revokeObjectURL(url)
            reject(new Error('The image could not be loaded.'))
        }
        img.src = url
    })
}

const rad = deg => (deg * Math.PI) / 180

// Size of the box that holds a w x h image rotated by `rotation` degrees
export function rotatedSize(w, h, rotation) {
    const r = rad(rotation)
    return {
        width: Math.round(Math.abs(Math.cos(r) * w) + Math.abs(Math.sin(r) * h)),
        height: Math.round(Math.abs(Math.sin(r) * w) + Math.abs(Math.cos(r) * h)),
    }
}

// Draw the source rotated and flipped onto a new canvas, scaled so its long
// edge is at most maxEdge. Corners opened up by a straighten angle are white.
export function renderGeometry(img, { rotation = 0, flipH = false, flipV = false }, maxEdge = Infinity) {
    const w = img.naturalWidth || img.width
    const h = img.naturalHeight || img.height
    const box = rotatedSize(w, h, rotation)
    const scale = Math.min(1, maxEdge / Math.max(box.width, box.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(box.width * scale))
    canvas.height = Math.max(1, Math.round(box.height * scale))
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    if (rotation % 90 !== 0) {
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.scale(scale, scale)
    ctx.translate(box.width / 2, box.height / 2)
    ctx.rotate(rad(rotation))
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
    ctx.drawImage(img, -w / 2, -h / 2)
    return canvas
}

// Copy a crop (in % of the source, as react-image-crop gives it) to a new
// canvas no larger than maxEdge on its long edge.
export function cropCanvas(source, crop, maxEdge = MAX_EDGE) {
    const pct = crop && crop.width > 0 && crop.height > 0 ? crop : { x: 0, y: 0, width: 100, height: 100 }
    const sx = (pct.x / 100) * source.width
    const sy = (pct.y / 100) * source.height
    const sw = Math.max(1, (pct.width / 100) * source.width)
    const sh = Math.max(1, (pct.height / 100) * source.height)
    const scale = Math.min(1, maxEdge / Math.max(sw, sh))
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(sw * scale))
    out.height = Math.max(1, Math.round(sh * scale))
    const ctx = out.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height)
    return out
}

// The editor's default adjustments. Slider values are percentages, as CSS
// filters take them: brightness/contrast/saturation 100 = unchanged, sharpen 0 = off.
export const NO_ADJUST = { brightness: 100, contrast: 100, saturation: 100, sharpen: 0 }

export const isAdjusted = a =>
    a.brightness !== 100 || a.contrast !== 100 || a.saturation !== 100 || a.sharpen > 0

// Sharpen is a 3x3 unsharp kernel; the slider (0 to 100) maps to its strength.
export const sharpenStrength = sharpen => sharpen / 100

// CSS filter string for the live preview. Sharpen uses an SVG filter with the
// same kernel (see ImageEditor), so preview and saved photo match.
export function cssFilter(a, sharpenFilterId) {
    const parts = [`brightness(${a.brightness}%)`, `contrast(${a.contrast}%)`, `saturate(${a.saturation}%)`]
    if (a.sharpen > 0 && sharpenFilterId) parts.push(`url(#${sharpenFilterId})`)
    return parts.join(' ')
}

// Apply the adjustments to a canvas in place, in the same order and with the
// same formulas as the CSS filters (Filter Effects spec), so what you see in
// the editor is what gets saved.
export function applyAdjustments(canvas, a) {
    if (!isAdjusted(a)) return canvas
    const ctx = canvas.getContext('2d')
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = image.data
    const b = a.brightness / 100
    const c = a.contrast / 100
    const s = a.saturation / 100
    const clamp = v => (v < 0 ? 0 : v > 255 ? 255 : v)
    // saturate() matrix
    const m = [
        0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
        0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
        0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ]
    for (let i = 0; i < d.length; i += 4) {
        let r = clamp(d[i] * b), g = clamp(d[i + 1] * b), bl = clamp(d[i + 2] * b)
        r = clamp((r - 127.5) * c + 127.5)
        g = clamp((g - 127.5) * c + 127.5)
        bl = clamp((bl - 127.5) * c + 127.5)
        d[i]     = m[0] * r + m[1] * g + m[2] * bl
        d[i + 1] = m[3] * r + m[4] * g + m[5] * bl
        d[i + 2] = m[6] * r + m[7] * g + m[8] * bl
    }
    if (a.sharpen > 0) sharpenData(image, sharpenStrength(a.sharpen))
    ctx.putImageData(image, 0, 0)
    return canvas
}

// 3x3 sharpen: centre 1 + 4k, up/down/left/right -k. Edges keep their pixels.
function sharpenData(image, k) {
    const { width: w, height: h, data } = image
    const src = new Uint8ClampedArray(data)
    const centre = 1 + 4 * k
    const row = w * 4
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = (y * w + x) * 4
            for (let ch = 0; ch < 3; ch++) {
                const p = i + ch
                data[p] = centre * src[p] - k * (src[p - 4] + src[p + 4] + src[p - row] + src[p + row])
            }
        }
    }
}

// Canvas to an optimised file: WebP where the browser can encode it
// (Chrome, Edge, Firefox), JPEG otherwise (older Safari returns PNG for WebP).
export async function canvasToFile(canvas, baseName = 'photo') {
    let blob = await new Promise(r => canvas.toBlob(r, 'image/webp', WEBP_QUALITY))
    let ext = 'webp'
    if (!blob || blob.type !== 'image/webp') {
        blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85))
        ext = 'jpg'
    }
    if (!blob) throw new Error('The image could not be saved.')
    const name = `${baseName.replace(/\.[^.]+$/, '') || 'photo'}.${ext}`
    return new File([blob], name, { type: blob.type })
}

// Shrink and re-encode an upload. Returns the original file when it cannot be
// decoded (e.g. HEIC on Windows), is not a photo type, or would not get smaller.
export async function optimiseImage(file) {
    if (!file || !OPTIMISABLE.test(file.type)) return file
    try {
        const img = await loadImage(file)
        const canvas = cropCanvas(renderGeometry(img, {}), null, MAX_EDGE)
        const out = await canvasToFile(canvas, file.name)
        const resized = canvas.width < img.naturalWidth || canvas.height < img.naturalHeight
        return out.size < file.size || resized ? out : file
    } catch {
        return file
    }
}

// ── Collage split ───────────────────────────────────────────────
// Find the photos in a collage by the plain gaps between them. The gap colour
// is taken from the top-left corner (usually white, sometimes black). The
// collage is cut along gaps that run right across it, then each piece is cut
// again the other way, and so on, which handles grids and most
// "one big, two small" layouts. Returns crops in % of the canvas.
export function detectCollageTiles(source) {
    const scale = Math.min(1, 600 / Math.max(source.width, source.height))
    const w = Math.max(1, Math.round(source.width * scale))
    const h = Math.max(1, Math.round(source.height * scale))
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(source, 0, 0, w, h)
    const d = ctx.getImageData(0, 0, w, h).data
    const bg = [d[0], d[1], d[2]]
    const isBg = new Uint8Array(w * h)
    for (let i = 0, p = 0; p < w * h; i += 4, p++) {
        isBg[p] = Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) < 36 ? 1 : 0
    }

    // Runs of content along one axis of a region, split by lines that are
    // (almost) all gap colour. Bands thinner than minFrac of the region are dropped.
    function bands(x0, y0, x1, y1, vertical) {
        const len = vertical ? x1 - x0 : y1 - y0
        const across = vertical ? y1 - y0 : x1 - x0
        const out = []
        let start = -1
        for (let i = 0; i <= len; i++) {
            let gap = true
            if (i < len) {
                let bgCount = 0
                for (let j = 0; j < across; j++) {
                    const x = vertical ? x0 + i : x0 + j
                    const y = vertical ? y0 + j : y0 + i
                    bgCount += isBg[y * w + x]
                }
                gap = bgCount >= across * 0.97
            }
            if (!gap && start < 0) start = i
            if (gap && start >= 0) {
                if (i - start >= len * 0.08) out.push([start, i])
                start = -1
            }
        }
        return out
    }

    const tiles = []
    function split(x0, y0, x1, y1, vertical, depth) {
        const b = bands(x0, y0, x1, y1, vertical)
        if (b.length > 1 && depth < 6) {
            b.forEach(([s, e]) => vertical
                ? split(x0 + s, y0, x0 + e, y1, !vertical, depth + 1)
                : split(x0, y0 + s, x1, y0 + e, !vertical, depth + 1))
            return
        }
        // No cut this way: try the other way once before calling it a tile
        const other = bands(x0, y0, x1, y1, !vertical)
        if (other.length > 1 && depth < 6) {
            other.forEach(([s, e]) => !vertical
                ? split(x0 + s, y0, x0 + e, y1, vertical, depth + 1)
                : split(x0, y0 + s, x1, y0 + e, vertical, depth + 1))
            return
        }
        if (!b.length || !other.length) return   // nothing but gap colour
        // Trim the gap colour around the tile
        const tb = b[0] || [0, vertical ? x1 - x0 : y1 - y0]
        const ob = other[0] || [0, vertical ? y1 - y0 : x1 - x0]
        const [xs, xe] = vertical ? tb : ob
        const [ys, ye] = vertical ? ob : tb
        // Step in 1px (at this scale) so the blended edge of the gap is left out
        tiles.push({ x0: x0 + xs + 1, y0: y0 + ys + 1, x1: x0 + xe - 1, y1: y0 + ye - 1 })
    }
    // Rows first, then columns, so a grid comes out in reading order
    split(0, 0, w, h, false, 0)

    return tiles
        .filter(t => (t.x1 - t.x0) * (t.y1 - t.y0) >= w * h * 0.02)
        .map(t => ({
            unit: '%',
            x: (t.x0 / w) * 100,
            y: (t.y0 / h) * 100,
            width: ((t.x1 - t.x0) / w) * 100,
            height: ((t.y1 - t.y0) / h) * 100,
        }))
}
