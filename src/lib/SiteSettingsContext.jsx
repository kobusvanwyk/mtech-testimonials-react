import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'
import { normaliseNameMode } from './displayName'

const SiteSettingsContext = createContext({ privateMode: false, nameDisplay: 'full', showDates: true, loading: true, isLoggedIn: false })

export function SiteSettingsProvider({ children }) {
    const [privateMode, setPrivateMode] = useState(false)
    const [nameDisplay, setNameDisplay] = useState('full')
    const [showDates, setShowDates]     = useState(true)
    const [isLoggedIn, setIsLoggedIn]   = useState(false)
    const [loading, setLoading]         = useState(true)

    useEffect(() => {
        async function fetchAll() {
            const [{ data: settingsData }, { data: { session } }] = await Promise.all([
                supabase.from('site_settings').select('key, value').in('key', ['private_mode', 'name_display', 'show_dates']),
                supabase.auth.getSession()
            ])
            const get = k => (settingsData || []).find(r => r.key === k)?.value
            setPrivateMode(get('private_mode') === 'true')
            setNameDisplay(normaliseNameMode(get('name_display')))
            setShowDates(get('show_dates') !== 'false')
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

    // Returns the Supabase error (or null) so Settings can report a failed save
    async function setNameDisplayValue(val) {
        const prev = nameDisplay
        setNameDisplay(val)
        const { error } = await supabase
            .from('site_settings')
            .upsert({ key: 'name_display', value: val }, { onConflict: 'key' })
        if (error) setNameDisplay(prev)
        return error
    }

    async function setShowDatesValue(val) {
        setShowDates(val)
        const { error } = await supabase
            .from('site_settings')
            .upsert({ key: 'show_dates', value: String(val) }, { onConflict: 'key' })
        if (error) setShowDates(!val)
        return error
    }

    return (
        <SiteSettingsContext.Provider value={{ privateMode, nameDisplay, showDates, loading, isLoggedIn, setPrivateModeValue, setNameDisplayValue, setShowDatesValue }}>
            {children}
        </SiteSettingsContext.Provider>
    )
}

export function useSiteSettings() {
    return useContext(SiteSettingsContext)
}
