import { supabase } from './supabase'

// POST JSON to one of our Netlify functions with the signed-in user's token,
// which the AI functions require (netlify/lib/requireUser.js).
export async function postFunction(name, body, { signal } = {}) {
    const { data: { session } } = await supabase.auth.getSession()
    return fetch(`/.netlify/functions/${name}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
    })
}
