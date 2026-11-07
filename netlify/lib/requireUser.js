// Gate for the paid AI functions: only a signed-in user with an allowed role
// may call them. The browser sends the Supabase session token as
// "Authorization: Bearer ..."; we ask Supabase who that token belongs to, then
// read their role from public.user_roles (with their own token, so the
// database rules apply). No token, an expired token, a wrong role or a
// missing server config all fail closed, so nobody outside can spend credit.
//
// Roles: 'admin' and 'finder'. Before the roles migration has run (no table),
// every signed-in user counts as admin, matching what the database allows.

const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
})

async function readRole(url, key, token, userId) {
    const res = await fetch(`${url}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}`, {
        headers: { apikey: key, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const missing = body.code === '42P01' || body.code === 'PGRST205' || /does not exist|could not find the table/i.test(body.message || '')
        return missing ? 'admin' : null
    }
    const rows = await res.json()
    return rows?.[0]?.role === 'admin' ? 'admin' : 'finder'
}

export async function requireUser(event, { roles = ['admin'] } = {}) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) {
        return { response: json(500, { error: 'server_config', message: 'The server is missing its Supabase settings. Let the developer know.' }) }
    }

    const header = event.headers?.authorization || event.headers?.Authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    if (!token) {
        return { response: json(401, { error: 'unauthorised', message: 'Sign in to the admin to use this.' }) }
    }

    try {
        const res = await fetch(`${url}/auth/v1/user`, {
            headers: { apikey: key, Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
            return { response: json(401, { error: 'unauthorised', message: 'Your session has ended. Sign in again and retry.' }) }
        }
        const user = await res.json()
        if (!user?.id) {
            return { response: json(401, { error: 'unauthorised', message: 'Your session has ended. Sign in again and retry.' }) }
        }
        const role = await readRole(url, key, token, user.id)
        if (!role || !roles.includes(role)) {
            return { response: json(403, { error: 'forbidden', message: 'Your account does not have access to this.' }) }
        }
        return { user, role }
    } catch (err) {
        console.error('requireUser: Supabase check failed', err)
        return { response: json(503, { error: 'auth_unavailable', message: 'Sign-in could not be checked. Try again in a moment.' }) }
    }
}
