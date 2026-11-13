import { supabase } from './supabase'

/**
 * Clean a condition name before it is stored: drop anything in brackets (an AI
 * once saved "Cancer (implied by oncologist context)"), collapse spaces and
 * trim stray punctuation. Capitalisation is kept as given.
 */
export function cleanConditionName(name) {
    return String(name || '')
        .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
}

/** Clean a list of condition names, dropping blanks and case-insensitive repeats. */
export function cleanConditions(list = []) {
    const seen = new Set()
    const out = []
    for (const raw of list) {
        const name = cleanConditionName(raw)
        const key = name.toLowerCase()
        if (name && !seen.has(key)) { seen.add(key); out.push(name) }
    }
    return out
}

function normalise(name) {
    return cleanConditionName(name)
}

/**
 * When a testimonial is approved, add any new conditions to the master table.
 * - Checks case-insensitively so "High Blood Pressure" won't duplicate "high blood pressure"
 * - Existing conditions (by lowercase match) are silently skipped
 * - Returns { added: string[], errors: string[] }
 */
export async function syncConditionsOnApproval(conditions = []) {
    if (!conditions.length) return { added: [], errors: [] }

    const normalised = conditions.map(normalise).filter(Boolean)
    if (!normalised.length) return { added: [], errors: [] }

    // Fetch current master list
    const { data: existing, error: fetchError } = await supabase
        .from('conditions')
        .select('name')

    if (fetchError) {
        console.error('syncConditions: failed to fetch existing conditions', fetchError)
        return { added: [], errors: [fetchError.message] }
    }

    const existingLower = new Set((existing || []).map(r => r.name.toLowerCase()))

    // Only insert conditions that don't already exist (case-insensitive)
    const toInsert = normalised.filter(name => !existingLower.has(name.toLowerCase()))

    if (!toInsert.length) return { added: [], errors: [] }

    const rows = toInsert.map(name => ({ name, active: true, sort_order: 0 }))

    const { error: insertError } = await supabase
        .from('conditions')
        .insert(rows)

    if (insertError) {
        console.error('syncConditions: insert failed', insertError)
        return { added: [], errors: [insertError.message] }
    }

    console.log('syncConditions: added', toInsert)
    return { added: toInsert, errors: [] }
}
