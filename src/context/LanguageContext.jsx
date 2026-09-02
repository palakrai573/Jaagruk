import { createContext, useContext, useState, useCallback } from 'react'
import { getLanguage, setLanguage as persistLanguage, t as translate } from '../lib/i18n.js'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getLanguage())

  const changeLang = useCallback((code) => {
    persistLanguage(code)
    setLang(code)
  }, [])

  const t = useCallback((key) => translate(key, lang), [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
