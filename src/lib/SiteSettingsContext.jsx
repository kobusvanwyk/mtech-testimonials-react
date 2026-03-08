import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const SiteSettingsContext = createContext({ privateMode: false, loading: true })

export function SiteSettingsProvider({ children }) {
    const [privateMode, setPrivateMode] = useState(false)
    const [loading, setLoading]         = useState(true)

    useEffect(() => {
        async function fetchSettings() {
            const { data } = await supabase
                .from('site_settings')
                .select('key, value')
                .eq('key', 'private_mode')
                .single()
            if (data) setPrivateMode(data.value === 'true')
            setLoading(false)
        }
        fetchSettings()
    }, [])

    async function setPrivateModeValue(val) {
        setPrivateMode(val)
        await supabase
            .from('site_settings')
            .upsert({ key: 'private_mode', value: String(val) }, { onConflict: 'key' })
    }

    return (
        <SiteSettingsContext.Provider value={{ privateMode, loading, setPrivateModeValue }}>
            {children}
        </SiteSettingsContext.Provider>
    )
}

export function useSiteSettings() {
    return useContext(SiteSettingsContext)
}
