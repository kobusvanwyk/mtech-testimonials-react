// Find existing testimonials that look like a new piece of text, using the same
// TF-IDF cosine idea as the Duplicate Scanner: common domain words (Mannatech,
// product, health) are down-weighted, distinctive ones (names, numbers, places,
// specific conditions) dominate, so reworded or translated retellings still match.

const STOP = new Set((
    'a about after all also am an and are as at be been before being but by can could did do does for from ' +
    'had has have he her him his how i if in into is it its just me more most my no not of on only or our out ' +
    'over she so some such than that the their them then there these they this to too under up us very was we ' +
    'were what when where which who will with would you your yours it\'s i\'m i\'ve'
).split(/\s+/))

function tokenize(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9%]+/g, ' ')
        .split(' ')
        .filter(w => w.length >= 2 && !STOP.has(w))
}

function termCounts(text) {
    const tf = new Map()
    for (const w of tokenize(text)) tf.set(w, (tf.get(w) || 0) + 1)
    return tf
}

// texts[0] is the new text, the rest are existing testimonials.
// Returns weighted vectors with norms, IDF computed over the whole set.
function vectorise(texts) {
    const N = texts.length
    const docs = texts.map(t => ({ tf: termCounts(t) }))
    const df = new Map()
    docs.forEach(d => { for (const w of d.tf.keys()) df.set(w, (df.get(w) || 0) + 1) })
    docs.forEach(d => {
        d.vec = new Map()
        let sq = 0
        for (const [w, c] of d.tf) {
            const wt = c * Math.log(N / (df.get(w) || 1))
            if (wt > 0) { d.vec.set(w, wt); sq += wt * wt }
        }
        d.norm = Math.sqrt(sq) || 1
    })
    return docs
}

function cosine(a, b) {
    const [small, large] = a.vec.size < b.vec.size ? [a.vec, b.vec] : [b.vec, a.vec]
    let dot = 0
    for (const [w, wa] of small) { const wb = large.get(w); if (wb) dot += wa * wb }
    return dot / (a.norm * b.norm)
}

// items: [{ id, title, story_text, ... }]. Returns up to `limit` items with a
// `sim` score at or above `threshold`, most similar first.
export function findSimilar(text, items, { threshold = 0.5, limit = 3 } = {}) {
    if (!text || tokenize(text).length < 15 || !items?.length) return []
    const docs = vectorise([text, ...items.map(t => `${t.title || ''} ${t.story_text || ''}`)])
    const target = docs[0]
    return items
        .map((t, i) => ({ ...t, sim: cosine(target, docs[i + 1]) }))
        .filter(t => t.sim >= threshold)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, limit)
}
