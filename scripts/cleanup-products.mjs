/**
 * One-off script to normalise product names in all testimonials.
 * Run: node scripts/cleanup-products.mjs
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

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
// Any variant not in this map AND not in OFFICIAL will be dropped.
const MAP = {
    // Ambrotose family
    'Ambrotose':                    'Ambrotose Complex',
    'Ambrotose Advanced':           'Advanced Ambrotose',
    'Ambrotose Advanced Powder':    'Advanced Ambrotose',
    'Advanced Ambrotose Powder':    'Advanced Ambrotose',
    'AO':                           'Ambrotose AO',

    // Emprizone
    'Emprizone':                    'Emprizone Hydrating Gel',
    'Emprizone Gel':                'Emprizone Hydrating Gel',
    'Emprizone Hydrating Ge':       'Emprizone Hydrating Gel', // truncated import

    // EM•PACT
    'Em-pact':                      'EM•PACT',
    'Em-Pact':                      'EM•PACT',
    'Empact':                       'EM•PACT',
    'EMPACT':                       'EM•PACT',

    // FIRM
    'Firm':                         'FIRM with Ambrotose Crème',

    // Cardio Balance
    'Cardio':                       'Cardio Balance',
    'CardioBalance':                'Cardio Balance',
    'Cardiobalance':                'Cardio Balance',

    // GI-ProBalance
    'Gi-probalance':                'GI-ProBalance',
    'GI-Probalance':                'GI-ProBalance',

    // MannaBears
    'Mannabears':                   'MannaBears',

    // MannaCLEANSE
    'Mannacleanse':                 'MannaCLEANSE',

    // Manapol
    'Mannapol':                     'Manapol',

    // Manna-C
    'Manna C':                      'Manna-C',

    // NutriVerus
    'Nutriverus':                   'NutriVerus',

    // Omega 3
    'Omega-3':                      'Omega 3',
    'Omega':                        'Omega 3',

    // OsoLean
    'Osolean':                      'OsoLean',

    // PLUS
    'Plus':                         'PLUS',

    // TruPLENISH
    'Truplenish':                   'TruPLENISH',
    'TruPlenish':                   'TruPLENISH',

    // Catalyst (already correct but catch Ambrotose Catalyst)
    'Ambrotose Catalyst':           'Catalyst',
}

// ── Normalise a single product string ────────────────────────────────────────
function normalise(raw) {
    const trimmed = raw.trim()
    // Already canonical
    if (OFFICIAL.has(trimmed)) return trimmed
    // Known variant
    if (MAP[trimmed]) return MAP[trimmed]
    // Case-insensitive match against official list
    const lower = trimmed.toLowerCase()
    for (const official of OFFICIAL) {
        if (official.toLowerCase() === lower) return official
    }
    // Not recognised — drop it
    return null
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
    console.log('Fetching testimonials...')
    const { data: testimonials, error } = await supabase
        .from('testimonials')
        .select('id, products')

    if (error) { console.error(error); process.exit(1) }
    console.log(`Found ${testimonials.length} testimonials.`)

    let updated = 0
    let totalDropped = 0

    for (const t of testimonials) {
        const raw = t.products || []
        const cleaned = []
        const seen = new Set()

        for (const p of raw) {
            const canonical = normalise(p)
            if (!canonical) {
                console.log(`  [${t.id.slice(0,8)}] DROPPING: "${p}"`)
                totalDropped++
                continue
            }
            if (!seen.has(canonical)) {
                seen.add(canonical)
                cleaned.push(canonical)
            }
        }

        // Only update if something changed
        const changed =
            raw.length !== cleaned.length ||
            raw.some((p, i) => p !== cleaned[i])

        if (changed) {
            const { error: updateError } = await supabase
                .from('testimonials')
                .update({ products: cleaned })
                .eq('id', t.id)

            if (updateError) {
                console.error(`  Error updating ${t.id}:`, updateError.message)
            } else {
                console.log(`  [${t.id.slice(0,8)}] ${raw.join(', ')} → ${cleaned.join(', ')}`)
                updated++
            }
        }
    }

    console.log(`\nDone. Updated ${updated} testimonials, dropped ${totalDropped} unrecognised product entries.`)
}

run()
