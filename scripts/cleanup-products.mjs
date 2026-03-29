/**
 * One-off script to normalise product names in all testimonials.
 * Run: node scripts/cleanup-products.mjs
 *
 * Set DRY_RUN = true to preview changes without saving anything.
 * Set DRY_RUN = false to apply changes for real.
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Set to false when you're happy with the preview ───────────────────────────
const DRY_RUN = true

// ── Load env from .env.local ──────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
const env = Object.fromEntries(
    readFileSync(envPath, 'utf8')
        .split('\n')
        .filter(l => l.includes('='))
        .map(l => l.split('=').map(s => s.trim()))
)

const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY
)

// ── Official product list ─────────────────────────────────────────────────────
const OFFICIAL = new Set([
    'Advanced Ambrotose',
    'Ambrotose AO',
    'Ambrotose Complex',
    'BounceBack',
    'Cardio Balance',
    'Catalyst',
    'EM•PACT',
    'Emprizone Hydrating Gel',
    'FIRM with Ambrotose Crème',
    'GI-ProBalance',
    'GI-Zyme',
    'GlycoCafé',
    'ImmunoSTART',
    'Luminovation First Essential Toner',
    'Luminovation Luminous Essence Lotion',
    'Luminovation Purifying Deep Cleanser',
    'Luminovation Youth Intensive Cream',
    'Manapol',
    'Manna-C',
    'MannaBears',
    'MannaCLEANSE',
    'NutriVerus',
    'Omega 3',
    'OsoLean',
    'PhytoMatrix',
    'PLUS',
    'Superfood Greens and Reds',
    'TruPLENISH',
])

// ── Variant → canonical mapping ───────────────────────────────────────────────
const MAP = {
    // Ambrotose family
    'Ambrotose':                        'Ambrotose Complex',
    'Ambrotose Advanced':               'Advanced Ambrotose',
    'Ambrotose Advanced Powder':        'Advanced Ambrotose',
    'Advanced Ambrotose Powder':        'Advanced Ambrotose',
    'AO':                               'Ambrotose AO',

    // Emprizone
    'Emprizone':                        'Emprizone Hydrating Gel',
    'Emprizone Gel':                    'Emprizone Hydrating Gel',
    'Emprizone Hydrating Ge':           'Emprizone Hydrating Gel',

    // EM•PACT
    'Em-pact':                          'EM•PACT',
    'Em-Pact':                          'EM•PACT',
    'Empact':                           'EM•PACT',
    'EMPACT':                           'EM•PACT',

    // FIRM
    'Firm':                             'FIRM with Ambrotose Crème',

    // Cardio Balance
    'Cardio':                           'Cardio Balance',
    'CardioBalance':                    'Cardio Balance',
    'Cardiobalance':                    'Cardio Balance',

    // GI-ProBalance
    'Gi-probalance':                    'GI-ProBalance',
    'GI-Probalance':                    'GI-ProBalance',

    // MannaBears
    'Mannabears':                       'MannaBears',

    // MannaCLEANSE
    'Mannacleanse':                     'MannaCLEANSE',

    // Manapol
    'Mannapol':                         'Manapol',

    // Manna-C
    'Manna C':                          'Manna-C',

    // NutriVerus
    'Nutriverus':                       'NutriVerus',

    // Omega 3
    'Omega-3':                          'Omega 3',
    'Omega':                            'Omega 3',

    // OsoLean
    'Osolean':                          'OsoLean',

    // PLUS
    'Plus':                             'PLUS',

    // TruPLENISH
    'Truplenish':                       'TruPLENISH',
    'TruPlenish':                       'TruPLENISH',

    // Catalyst
    'Ambrotose Catalyst':               'Catalyst',

    // Phyt-Aloe → not on official list, drop (return null via normalise)
}

// ── Normalise a single product string ────────────────────────────────────────
function normalise(raw) {
    const trimmed = raw.trim()
    if (OFFICIAL.has(trimmed)) return trimmed
    if (MAP[trimmed]) return MAP[trimmed]
    // Case-insensitive fallback against official list
    const lower = trimmed.toLowerCase()
    for (const official of OFFICIAL) {
        if (official.toLowerCase() === lower) return official
    }
    return null // will be dropped
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
    console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be saved\n' : '✍️  LIVE RUN — changes will be saved\n')

    const { data: testimonials, error } = await supabase
        .from('testimonials')
        .select('id, products, title')

    if (error) { console.error('Failed to fetch:', error.message); process.exit(1) }
    console.log(`Fetched ${testimonials.length} testimonials.\n`)

    let updated = 0
    let unchanged = 0
    let totalDropped = 0
    const dropped = []

    for (const t of testimonials) {
        const raw = t.products || []
        const cleaned = []
        const seen = new Set()

        for (const p of raw) {
            const canonical = normalise(p)
            if (!canonical) {
                dropped.push({ id: t.id.slice(0,8), title: t.title, product: p })
                totalDropped++
                continue
            }
            if (!seen.has(canonical)) {
                seen.add(canonical)
                cleaned.push(canonical)
            }
        }

        const before = JSON.stringify(raw)
        const after  = JSON.stringify(cleaned)
        const changed = before !== after

        if (changed) {
            console.log(`[${t.id.slice(0,8)}] "${t.title?.slice(0,40)}"`)
            console.log(`  Before: ${raw.join(', ') || '(empty)'}`)
            console.log(`  After:  ${cleaned.join(', ') || '(empty)'}`)
            console.log()

            if (!DRY_RUN) {
                const { error: updateError } = await supabase
                    .from('testimonials')
                    .update({ products: cleaned })
                    .eq('id', t.id)
                if (updateError) {
                    console.error(`  ❌ Error updating ${t.id}: ${updateError.message}`)
                } else {
                    updated++
                }
            } else {
                updated++
            }
        } else {
            unchanged++
        }
    }

    console.log('─'.repeat(60))
    console.log(`\nSummary:`)
    console.log(`  Testimonials to update:    ${updated}`)
    console.log(`  Testimonials unchanged:    ${unchanged}`)
    console.log(`  Product entries to drop:   ${totalDropped}`)

    if (dropped.length) {
        console.log(`\nProducts being dropped:`)
        dropped.forEach(d => console.log(`  [${d.id}] "${d.title?.slice(0,40)}" → dropping "${d.product}"`))
    }

    if (DRY_RUN) {
        console.log(`\n✅ Dry run complete. If this looks correct, set DRY_RUN = false and run again.`)
    } else {
        console.log(`\n✅ Done. ${updated} testimonials updated.`)
    }
}

run()

