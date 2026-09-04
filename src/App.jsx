import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import HazardScan from './pages/HazardScan.jsx'
import Scenario from './pages/Scenario.jsx'
import ScenarioList from './pages/ScenarioList.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Settings from './pages/Settings.jsx'
import Certification from './pages/Certification.jsx'
import Verify from './pages/Verify.jsx'
import Admin from './pages/Admin.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Refresher from './pages/Refresher.jsx'
import SiteSetup from './pages/SiteSetup.jsx'
import BuddyDrill from './pages/BuddyDrill.jsx'
import ReportHazard from './pages/ReportHazard.jsx'
import LanguageSwitcher from './components/LanguageSwitcher.jsx'
import ChatBox from './components/ChatBox.jsx'
import GestureLayer from './components/GestureLayer.jsx'
import { ThemeToggle } from './components/ui/index.js'
import Pictogram from './lib/pictograms.jsx'
import { useLanguage } from './context/LanguageContext.jsx'
import { isPartiallyTranslated, coverageNotice } from './lib/i18n.js'
import { getCurrentWorker, ROLE } from './lib/identity.js'
import { registerAutoSync, pendingCount, isOnline } from './lib/sync.js'
import { dueRefreshers } from './lib/spaced.js'
import { listAttempts, bestByDomain } from './lib/assessment.js'
import { LS, lsGetBool } from './lib/local.js'

/**
 * App shell.
 *
 * Navigation is split deliberately. The five things a worker does daily sit in
 * the bottom bar within thumb reach; everything else lives behind "More".
 * Cramming eleven destinations into one bar would make the frequent ones harder
 * to hit, which on a phone held in a gloved hand is the difference between a
 * feature being used and being abandoned.
 */

const PRIMARY_NAV = [
  { to: '/', key: 'nav_home', pictogram: 'assembly_point', end: true },
  { to: '/train', key: 'nav_train', pictogram: 'ppe' },
  { to: '/refresher', key: 'nav_refresher', pictogram: 'alarm' },
  { to: '/report', key: 'nav_report', pictogram: 'report_it' },
]

const SECONDARY_NAV = [
  { to: '/scan', key: 'nav_scan', pictogram: 'warning' },
  { to: '/buddy', key: 'nav_buddy', pictogram: 'buddy' },
  { to: '/certification', key: 'nav_cert', pictogram: 'correct' },
  { to: '/dashboard', key: 'nav_dashboard', pictogram: 'machinery' },
  { to: '/site', key: 'nav_site', pictogram: 'exit' },
  { to: '/settings', key: 'nav_settings', pictogram: 'lockout' },
]

export default function App() {
  const { t, lang } = useLanguage()
  const location = useLocation()

  const [moreOpen, setMoreOpen] = useState(false)
  const [worker, setWorker] = useState(null)
  const [pending, setPending] = useState(0)
  const [dueCount, setDueCount] = useState(0)
  const [online, setOnline] = useState(() => isOnline())
  const [gestureOn, setGestureOn] = useState(() => lsGetBool(LS.MODE_GESTURE, false))

  /* ---------------- shell state ---------------- */

  const refreshShell = useCallback(async () => {
    try {
      const current = await getCurrentWorker()
      setWorker(current)

      const [queued, attempts] = await Promise.all([pendingCount(), listAttempts(current?.id || '')])
      setPending(queued)

      const due = await dueRefreshers(current?.id || '', bestByDomain(attempts))
      setDueCount(due.length)

      // Re-read the accessibility toggle here rather than only on first mount,
      // so switching it on in Settings and walking into a drill takes effect.
      setGestureOn(lsGetBool(LS.MODE_GESTURE, false))
    } catch {
      // The shell must render even if storage is unavailable.
      setPending(0)
      setDueCount(0)
    }
  }, [])

  useEffect(() => {
    refreshShell()
  }, [refreshShell, location.pathname])

  // Opportunistic sync whenever connectivity returns or the app is foregrounded.
  useEffect(() => {
    const unsubscribe = registerAutoSync({ onResult: () => refreshShell() })
    return unsubscribe
  }, [refreshShell])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Close the More sheet on navigation, otherwise it stays over the new page.
  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col">
      {/*
        HEADER WIDTH BUDGET — the reason this markup is specific.

        The container is max-w-5xl to stay aligned with the page content below, so
        after px-5 there is only ~984px of usable width however wide the viewport
        is. An earlier version put seven nav items in here plus the session chip,
        theme toggle and language select, which needs roughly 1190px. The overflow
        did not merely look tight: the wordmark's parent had `min-w-0 shrink` while
        the wordmark span itself had `shrink-0`, so flex collapsed the parent, the
        text overflowed a box with no clipping, and the nav — positioned against
        that collapsed width — rendered on top of the letters. "JAAGRUK" appeared
        as "J" + the Home pill + "RUK".

        Fixed by removing the cause rather than clipping the symptom:
          - the wordmark never shrinks (shrink-0). The brand is not the thing that
            gets crushed when space runs out.
          - desktop nav carries the same FOUR primary destinations as the mobile
            bottom bar, which fits in ~368px and is more coherent besides. The
            secondary destinations are in the footer and in Home's Explore grid,
            so nothing became unreachable.
          - the right-hand control group is min-w-0, so if anything must compress
            it is the controls, not the identity.

        No flex-wrap, deliberately: it previously let the nav drop onto a second row
        at ~380px, which made the sticky bar change height as you scrolled.
      */}
      <header className="border-b border-line-subtle sticky top-0 bg-surface-0/90 backdrop-blur-md z-sticky">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          {/* Wordmark only — no tagline.
              With the tagline the widest language (English) came to 970px against
              984px usable: it fitted, but on 14px of headroom, which is inside the
              margin of error for font metrics across devices. The footer already
              carries brand and tagline together, and a header's job is navigation,
              so dropping it here buys ~144px of real headroom instead. */}
          <NavLink to="/" className="flex items-center shrink-0" aria-label={t('app_name')}>
            <span className="font-display text-2xl tracking-wide text-brand-text font-bold leading-none">
              {t('app_name')}
            </span>
          </NavLink>

          <div className="flex items-center gap-3 min-w-0">
            <nav className="hidden md:flex gap-1 font-mono text-sm">
              {PRIMARY_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `relative px-3 py-2 rounded-md transition-colors duration-fast whitespace-nowrap ${
                      isActive
                        ? 'bg-brand-subtle text-brand-text font-bold'
                        : 'text-ink-tertiary hover:text-ink hover:bg-surface-2'
                    }`
                  }
                >
                  {t(item.key)}
                  {item.to === '/refresher' && dueCount > 0 && <CountBadge count={dueCount} />}
                </NavLink>
              ))}
            </nav>

            <SessionChip worker={worker} t={t} />
            <ThemeToggle
              compact
              labels={{
                dark: t('th_dark'),
                light: t('th_light'),
                system: t('th_system'),
              }}
            />
            <LanguageSwitcher />
          </div>
        </div>

        {/* Status strip: only rendered when there is something to say */}
        {(!online || pending > 0) && (
          <div
            aria-live="polite"
            className="bg-surface-2 border-t border-line-subtle px-5 py-1.5 flex items-center justify-center gap-4 font-mono text-2xs uppercase tracking-widest"
          >
            {!online && (
              <span className="text-warning-text flex items-center gap-1.5">
                <Pictogram name="warning" size={12} />
                {t('offline_label')}
              </span>
            )}
            {pending > 0 && (
              <span className="text-ink-tertiary">
                {pending} {t('db_pending_sync')}
              </span>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 pb-24 md:pb-0">
        {isPartiallyTranslated(lang) && (
          <div className="bg-warning-subtle border-b border-warning-border px-5 py-2 text-center text-xs text-warning-text font-mono">
            {coverageNotice(lang)}
          </div>
        )}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/start" element={<Onboarding />} />
          <Route path="/scan" element={<HazardScan />} />
          <Route path="/train" element={<ScenarioList />} />
          <Route path="/train/:id" element={<Scenario />} />
          <Route path="/buddy" element={<BuddyDrill />} />
          <Route path="/refresher" element={<Refresher />} />
          <Route path="/report" element={<ReportHazard />} />
          <Route path="/site" element={<SiteSetup />} />
          <Route path="/certification" element={<Certification />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:certId" element={<Verify />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          {/* A mistyped hash should land somewhere useful, not on a blank page. */}
          <Route path="*" element={<NotFound t={t} />} />
        </Routes>
      </main>

      {/* Mobile bottom bar.
          safe-area padding matters on notched phones: without it the last few
          pixels of the tap target sit under the home indicator, so the bar looks
          right and mis-taps anyway. Each item is min-h-12 to stay thumb-sized. */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-surface-1/95 backdrop-blur-md border-t border-line-subtle
                   flex justify-around font-mono text-2xs z-nav
                   pb-[env(safe-area-inset-bottom)]"
      >
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 flex-1 min-h-[52px] py-2 px-1
               transition-colors duration-fast ${isActive ? 'text-brand-text' : 'text-ink-tertiary'}`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator on the top edge: a colour change alone is easy
                    to miss on a small, dim screen. */}
                <span
                  aria-hidden="true"
                  className={`absolute top-0 inset-x-4 h-0.5 rounded-full transition-opacity duration-base ${
                    isActive ? 'bg-brand opacity-100' : 'opacity-0'
                  }`}
                />
                <Pictogram name={item.pictogram} size={22} />
                <span className="leading-none truncate max-w-full">{t(item.key)}</span>
                {/* Centred over the icon rather than at the item's far edge: the
                    bar items are flex-1 and wide, so a corner offset would put the
                    badge nowhere near the thing it counts. */}
                {item.to === '/refresher' && dueCount > 0 && (
                  <CountBadge count={dueCount} className="top-1.5 end-[calc(50%-1.25rem)]" />
                )}
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[52px] py-2 px-1
                      transition-colors duration-fast ${moreOpen ? 'text-brand-text' : 'text-ink-tertiary'}`}
        >
          <span className="text-xl leading-none h-[22px] flex items-center" aria-hidden="true">
            {moreOpen ? '×' : '⋯'}
          </span>
          <span className="leading-none truncate max-w-full">{t('more_label')}</span>
        </button>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label={t('close_label')}
            onClick={() => setMoreOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-30"
          />
          <div
            className="md:hidden fixed inset-x-3 bg-surface-2 border border-line rounded-xl p-3 z-sheet shadow-4 rise-in
                       bottom-[calc(3.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="grid grid-cols-3 gap-2">
              {SECONDARY_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-2 rounded-lg p-3 min-h-[76px]
                     transition-colors duration-fast ${
                       isActive ? 'bg-brand-subtle text-brand-text' : 'text-ink-tertiary hover:bg-surface-3'
                     }`
                  }
                >
                  <Pictogram name={item.pictogram} size={26} />
                  <span className="font-mono text-2xs text-center leading-tight">{t(item.key)}</span>
                </NavLink>
              ))}
            </div>

            <div className="border-t border-line-subtle mt-3 pt-3 flex items-center justify-between gap-3">
              <NavLink
                to="/admin"
                className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary py-2 px-1"
              >
                {t('nav_admin')} →
              </NavLink>
              <NavLink
                to="/start"
                className="font-mono text-2xs uppercase tracking-widest text-brand-text py-2 px-1"
              >
                {worker ? t('ob_sign_out') : t('nav_start')}
              </NavLink>
            </div>
          </div>
        </>
      )}

      {/* Footer. Previously desktop-only and two links wide, which meant a phone
          user had no route to verification or admin outside the More sheet. Now it
          renders everywhere, below the bottom nav's clearance. */}
      <footer className="border-t border-line-subtle bg-surface-1 mt-auto">
        <div className="max-w-5xl mx-auto px-5 py-8">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="min-w-0">
              <p className="font-display font-bold text-xl tracking-wide text-brand-text mb-1.5">{t('app_name')}</p>
              <p className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary">{t('app_tagline')}</p>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                { to: '/verify', label: t('vf_check_now') },
                { to: '/dashboard', label: t('nav_dashboard') },
                { to: '/settings', label: t('nav_settings') },
                { to: '/admin', label: t('nav_admin') },
              ].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary
                             hover:text-brand-text transition-colors duration-fast py-1"
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="stripe-divider mt-8 opacity-70 rounded-full" />
        </div>
      </footer>

      <ChatBox />

      {/*
        Mounted at the shell level on purpose. The layer hit-tests anything with
        `data-gesture-target`, so mounting it once here makes every such control
        in the app gesture-operable without each page knowing about it.
      */}
      <GestureLayer enabled={gestureOn} />
    </div>
  )
}

/* ================================================================== */

/**
 * Count badge.
 *
 * Position is passed in rather than fixed, because the two call sites have
 * different geometry: a desktop nav pill is small and the badge belongs just
 * outside its corner, while a mobile bar item is `flex-1` and therefore wide, so
 * the same offset would strand the badge far from the icon it refers to.
 *
 * Logical `end-*` throughout, never `right-*`, so it mirrors for Urdu.
 */
function CountBadge({ count, className = '-top-1 -end-1' }) {
  return (
    <span
      className={`absolute ${className} min-w-[16px] h-4 px-1 rounded-full bg-hazard text-white font-mono text-[9px] font-bold flex items-center justify-center tabular-nums`}
      aria-hidden="true"
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

function SessionChip({ worker, t }) {
  if (!worker) {
    return (
      <NavLink
        to="/start"
        className="font-mono text-2xs uppercase tracking-widest border border-line-subtle rounded-md px-2.5 min-h-[40px] flex items-center text-ink-tertiary hover:border-brand hover:text-brand-text transition-colors duration-fast whitespace-nowrap"
      >
        {t('nav_start')}
      </NavLink>
    )
  }

  return (
    <NavLink
      to="/start"
      className="flex items-center gap-2 border border-line-subtle rounded-md px-2.5 min-h-[40px] hover:border-brand transition-colors duration-fast max-w-[140px]"
      title={worker.name}
    >
      <Pictogram name={worker.role === ROLE.SUPERVISOR ? 'report_it' : 'ppe'} size={16} />
      <span className="font-mono text-2xs text-ink truncate">{worker.name}</span>
    </NavLink>
  )
}

function NotFound({ t }) {
  return (
    <div className="max-w-md mx-auto px-5 py-20 text-center">
      <Pictogram name="warning" size={48} className="mx-auto mb-5" />
      <p className="text-ink-secondary mb-7">{t('vf_unreadable')}</p>
      <NavLink
        to="/"
        className="inline-flex items-center justify-center bg-brand text-ink-onBrand font-display font-bold uppercase tracking-wide px-6 py-3 rounded-lg shadow-1 hover:bg-brand-hover transition-colors duration-base"
      >
        {t('nav_home')}
      </NavLink>
    </div>
  )
}
