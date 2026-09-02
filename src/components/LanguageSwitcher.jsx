import { LANGUAGES } from '../lib/i18n.js'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useLanguage()
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className={`bg-steel-light border border-steel-lighter rounded px-2 py-1.5 text-xs font-mono text-chalk focus:border-amber outline-none ${className}`}
      aria-label="Select language"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.native}
        </option>
      ))}
    </select>
  )
}
