import { supabase } from './supabase'

/**
 * When a testimonial is approved, add any new conditions to the master table.
 * Existing conditions are skipped silently (upsert with onConflict ignore).
 */
export async function syncConditionsOnApproval(conditions = []) {
    if (!conditions.length) return
    const rows = conditions.map(name => ({ name, active: true, sort_order: 0 }))
    await supabase
        .from('conditions')
        .upsert(rows, { onConflict: 'name', ignoreDuplicates: true })
}
