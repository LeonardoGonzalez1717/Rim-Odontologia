// =============================================================================
// main.jsx — Punto de entrada de la aplicación React
// =============================================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { checkAppVersion } from './utils/appVersion.js'
import './index.css'

checkAppVersion()

// Montar la aplicación en el elemento #root del index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
