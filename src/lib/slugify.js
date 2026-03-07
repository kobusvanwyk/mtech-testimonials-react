import { supabase } from './supabase'

/**
 * Convert a string to a URL-friendly slug.
 * e.g. "Ambrotose helped MY Arthritis!" → "ambrotose-helped-my-arthritis"
 */
export function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')     // remove non-word chars except spaces and hyphens
        .replace(/[\s_]+/g, '-')      // spaces/underscores → hyphens
        .replace(/-+/g, '-')          // collapse multiple hyphens
        .replace(/^-+|-+$/g, '')      // trim leading/trailing hyphens
}

/**
 * Generate a unique slug for a testimonial title.
 * If "my-story" exists, tries "my-story-2", "my-story-3", etc.
 */
export async function generateUniqueSlug(title) {
    const base = slugify(title)
    let candidate = base
    let suffix = 2

    while (true) {
        const { data } = await supabase
            .from('testimonials')
            .select('id')
            .eq('slug', candidate)
            .maybeSingle()

        if (!data) return candidate   // slug is available
        candidate = `${base}-${suffix}`
        suffix++
    }
}
