import { supabase } from './supabase'

/**
 * Normalise a condition name: trim whitespace.
 * We preserve the user's capitalisation as submitted.
 */
function normalise(name) {
    return name.trim()
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
