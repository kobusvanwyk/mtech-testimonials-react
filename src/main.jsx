import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.scss'
import { ProductsProvider } from './lib/ProductsContext'
import { SiteSettingsProvider } from './lib/SiteSettingsContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SiteSettingsProvider>
      <ProductsProvider>
        <App />
      </ProductsProvider>
    </SiteSettingsProvider>
  </StrictMode>,
)
