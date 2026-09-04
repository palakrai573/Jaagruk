import { LANGUAGES } from '../lib/i18n.js'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useLanguage()
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className={`bg-surface-1 border border-line-subtle rounded px-2 py-1.5 text-xs font-mono text-ink focus:border-brand outline-none ${className}`}
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
