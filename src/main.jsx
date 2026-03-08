import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.scss'
import { ProductsProvider } from './lib/ProductsContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProductsProvider>
      <App />
    </ProductsProvider>
  </StrictMode>,
)
