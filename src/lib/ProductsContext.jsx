import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const ProductsContext   = createContext([])
const ConditionsContext = createContext([])

export function ProductsProvider({ children }) {
    const [products,   setProducts]   = useState([])
    const [conditions, setConditions] = useState([])

    useEffect(() => {
        async function fetchAll() {
            const [{ data: pData }, { data: cData }] = await Promise.all([
                supabase.from('products').select('name').eq('active', true).order('sort_order').order('name'),
                supabase.from('conditions').select('name').eq('active', true).order('sort_order').order('name'),
            ])
            if (pData) setProducts(pData.map(p => p.name))
            if (cData) setConditions(cData.map(c => c.name))
        }
        fetchAll()
    }, [])

    return (
        <ProductsContext.Provider value={products}>
            <ConditionsContext.Provider value={conditions}>
                {children}
            </ConditionsContext.Provider>
        </ProductsContext.Provider>
    )
}

export function useProducts()   { return useContext(ProductsContext) }
export function useConditions() { return useContext(ConditionsContext) }
