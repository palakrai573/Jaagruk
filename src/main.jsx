import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { migrateLegacyKeys } from './lib/local.js'
import { requestPersistence } from './lib/idb.js'
import { applyTheme, watchSystemTheme } from './lib/theme.js'
import './index.css'

// Carry across settings saved under the app's previous name before anything
// reads them. Idempotent, and it never overwrites a value already set under the
// new name, so a user who has been through a rename keeps their language, key
// and history rather than starting over.
migrateLegacyKeys()

// Ask the browser not to evict our data. Best-effort — a refusal is fine and the
// Settings page reports the real storage status either way.
requestPersistence()

// The inline script in index.html already set the theme before first paint. This
// re-applies through the same code path so there is one source of truth, and then
// follows the OS while the preference is 'system'.
applyTheme()
watchSystemTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </HashRouter>
  </React.StrictMode>
)
