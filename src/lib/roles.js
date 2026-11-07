import { supabase } from './supabase'

// The signed-in user's role: 'admin' (everything) or 'finder' (Ask AI over
// published testimonials). Stored in public.user_roles
// (supabase/migrations/20261107_user_roles.sql).
//
// - Table not created yet (migration not run): 'admin', which matches what the
//   database itself still allows at that point.
// - No row for the user, or any other failure: 'finder', the least access.
export async function fetchRole(userId) {
    if (!userId) return null
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()
    if (error) {
        const missing = error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message || '')
        if (missing) return 'admin'
        console.error('Role check failed', error)
        return 'finder'
    }
    return data?.role === 'admin' ? 'admin' : 'finder'
}

// "View as Finder": an admin can preview the app exactly as a finder sees it.
// Screens only: the database still knows the real (admin) user, so pages that
// fetch data also apply the finder's limits themselves while previewing.
// Kept per browser tab (sessionStorage), so it ends when the tab closes.
const VIEW_AS_KEY = 'mtech_view_as'

export function isViewingAsFinder() {
    try { return sessionStorage.getItem(VIEW_AS_KEY) === 'finder' } catch { return false }
}

export function setViewingAsFinder(on) {
    try {
        if (on) sessionStorage.setItem(VIEW_AS_KEY, 'finder')
        else sessionStorage.removeItem(VIEW_AS_KEY)
    } catch { /* storage blocked: preview just will not persist */ }
}

// Pages a finder may open (everything else redirects to Ask AI)
export const FINDER_HOME = '/admin/ask'
export function finderMayOpen(pathname) {
    return pathname === FINDER_HOME || pathname.startsWith(FINDER_HOME + '/')
}
