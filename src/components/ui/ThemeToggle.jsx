import { useState, useEffect } from 'react'
import { THEME, getThemePreference, cycleTheme, resolveTheme, watchSystemTheme } from '../../lib/theme.js'

// Theme toggle.
//
// THREE STATES, NOT TWO
// dark -> light -> system. A two-state switch cannot express "follow my phone",
// which is what most users actually want, and it silently overrides the OS
// setting the first time it is touched.
//
// The icon shows the CURRENT EFFECTIVE theme; the label says which mode is
// selected. Those differ under 'system', and collapsing them would leave a user
// unable to tell whether they are on light-by-choice or light-by-OS.

const ICONS = {
  dark: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4.2" />
      <path
        d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="4" width="19" height="12.5" rx="1.8" />
      <path d="M8 20.5h8M12 16.5v4" strokeLinecap="round" />
    </svg>
  ),
}

export default function ThemeToggle({ labels = {}, compact = false, className = '' }) {
  const [preference, setPreference] = useState(() => getThemePreference())
  const [effective, setEffective] = useState(() => resolveTheme())

  // Keep the icon truthful when the OS flips while the preference is 'system'.
  useEffect(() => watchSystemTheme((next) => setEffective(next)), [])

  const onClick = () => {
    const next = cycleTheme()
    setPreference(getThemePreference())
    setEffective(next)
  }

  const pref = preference || THEME.SYSTEM
  const label = labels[pref] || pref
  const icon = ICONS[pref === THEME.SYSTEM ? 'system' : effective] || ICONS.dark

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={[
        'inline-flex items-center gap-2 rounded-lg border border-line-subtle text-ink-tertiary',
        'transition-colors duration-fast hover:border-brand hover:text-brand-text',
        compact ? 'p-2 min-w-[40px] min-h-[40px] justify-center' : 'px-3 py-2',
        className,
      ].join(' ')}
    >
      {icon}
      {compact ? null : (
        <span className="font-mono text-2xs uppercase tracking-widest hidden lg:inline">{label}</span>
      )}
    </button>
  )
}
