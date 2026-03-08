import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const SiteSettingsContext = createContext({ privateMode: false, loading: true, isLoggedIn: false })

export function SiteSettingsProvider({ children }) {
    const [privateMode, setPrivateMode] = useState(false)
    const [isLoggedIn, setIsLoggedIn]   = useState(false)
    const [loading, setLoading]         = useState(true)

    useEffect(() => {
        async function fetchAll() {
            const [{ data: settingsData }, { data: { session } }] = await Promise.all([
                supabase.from('site_settings').select('key, value').eq('key', 'private_mode').single(),
                supabase.auth.getSession()
            ])
            if (settingsData) setPrivateMode(settingsData.value === 'true')
            setIsLoggedIn(!!session)
            setLoading(false)
        }
        fetchAll()

        // Keep login state in sync if user logs in/out during session
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsLoggedIn(!!session)
        })
        return () => subscription.unsubscribe()
    }, [])

    async function setPrivateModeValue(val) {
        setPrivateMode(val)
        await supabase
            .from('site_settings')
            .upsert({ key: 'private_mode', value: String(val) }, { onConflict: 'key' })
    }

    return (
        <SiteSettingsContext.Provider value={{ privateMode, loading, isLoggedIn, setPrivateModeValue }}>
            {children}
        </SiteSettingsContext.Provider>
    )
}

export function useSiteSettings() {
    return useContext(SiteSettingsContext)
}
