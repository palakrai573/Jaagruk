import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { getLanguage, setLanguage as persistLanguage, t as translate } from '../lib/i18n.js'
import { activateFontForLang } from '../lib/fonts.js'
import { applyDirection, directionFor, isRtlLang } from '../lib/rtl.js'

const LanguageContext = createContext(null)

/**
 * Language, and the three document-level things that must move with it.
 *
 * Changing the language is not just a string swap. It has to change the font
 * stack (five of six languages have no Latin coverage), the text direction (Urdu
 * is RTL), and the document `lang` tag (which decides the screen-reader voice).
 * Doing those in the pages that happen to need them is how one of them gets
 * missed, so they are centralised here and run on every change.
 */
export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getLanguage())

  // Fires on mount too, so a returning user whose stored language is Santali gets
  // the Ol Chiki font and correct lang tag without touching the switcher.
  useEffect(() => {
    applyDirection(lang)
    activateFontForLang(lang)
  }, [lang])

  const changeLang = useCallback((code) => {
    persistLanguage(code)
    setLang(code)
  }, [])

  const t = useCallback((key) => translate(key, lang), [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang: changeLang,
      t,
      dir: directionFor(lang),
      isRtl: isRtlLang(lang),
    }),
    [lang, changeLang, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
