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
      <header className="border-b border-steel-lighter sticky top-0 bg-steel/95 backdrop-blur z-20">
        <div className="stripe-divider" />
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <NavLink to="/" className="flex items-baseline gap-2 min-w-0">
            <span className="font-display text-3xl tracking-wide text-amber font-bold">{t('app_name')}</span>
            <span className="font-mono text-xs text-concrete uppercase tracking-widest hidden sm:inline">
              {t('app_tagline')}
            </span>
          </NavLink>

          <div className="flex items-center gap-3">
            <nav className="hidden md:flex gap-1 font-mono text-sm">
              {[...PRIMARY_NAV, ...SECONDARY_NAV].slice(0, 7).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `relative px-3 py-2 rounded transition-colors ${
                      isActive ? 'bg-amber text-steel font-bold' : 'text-concrete hover:text-chalk hover:bg-steel-light'
                    }`
                  }
                >
                  {t(item.key)}
                  {item.to === '/refresher' && dueCount > 0 && <Badge count={dueCount} />}
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
          <div className="bg-steel-light border-t border-steel-lighter px-5 py-1.5 flex items-center justify-center gap-4 font-mono text-[10px] uppercase tracking-widest">
            {!online && (
              <span className="text-amber flex items-center gap-1.5">
                <Pictogram name="warning" size={12} />
                {t('offline_label')}
              </span>
            )}
            {pending > 0 && (
              <span className="text-concrete">
                {pending} {t('db_pending_sync')}
              </span>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 pb-24 md:pb-0">
        {isPartiallyTranslated(lang) && (
          <div className="bg-amber/10 border-b border-amber/40 px-5 py-2 text-center text-xs text-amber font-mono">
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

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-steel-light border-t border-steel-lighter flex justify-around py-2 font-mono text-[10px] z-30">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 px-2 py-1 ${isActive ? 'text-amber' : 'text-concrete'}`
            }
          >
            <Pictogram name={item.pictogram} size={22} />
            <span className="leading-none">{t(item.key)}</span>
            {item.to === '/refresher' && dueCount > 0 && <Badge count={dueCount} />}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          className={`flex flex-col items-center gap-1 px-2 py-1 ${moreOpen ? 'text-amber' : 'text-concrete'}`}
        >
          <span className="text-xl leading-none" aria-hidden="true">
            {moreOpen ? '×' : '⋯'}
          </span>
          <span className="leading-none">{t('more_label')}</span>
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
          <div className="md:hidden fixed bottom-16 inset-x-3 bg-steel-light border border-steel-lighter rounded-xl p-3 z-40 shadow-2xl">
            <div className="grid grid-cols-3 gap-2">
              {SECONDARY_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-2 rounded-lg p-3 ${
                      isActive ? 'bg-amber/15 text-amber' : 'text-concrete hover:bg-steel'
                    }`
                  }
                >
                  <Pictogram name={item.pictogram} size={26} />
                  <span className="font-mono text-[10px] text-center leading-tight">{t(item.key)}</span>
                </NavLink>
              ))}
            </div>

            <div className="border-t border-steel-lighter mt-3 pt-3 flex items-center justify-between">
              <NavLink to="/admin" className="font-mono text-[10px] uppercase tracking-widest text-concrete">
                {t('nav_admin')} →
              </NavLink>
              <NavLink to="/start" className="font-mono text-[10px] uppercase tracking-widest text-amber">
                {worker ? t('ob_sign_out') : t('nav_start')}
              </NavLink>
            </div>
          </div>
        </>
      )}

      <footer className="hidden md:block">
        <div className="stripe-divider" />
        <div className="text-center py-3 bg-steel flex items-center justify-center gap-6">
          <NavLink
            to="/admin"
            className="text-concrete text-[10px] font-mono uppercase tracking-widest hover:text-amber"
          >
            {t('nav_admin')} →
          </NavLink>
          <NavLink
            to="/verify"
            className="text-concrete text-[10px] font-mono uppercase tracking-widest hover:text-amber"
          >
            {t('vf_check_now')} →
          </NavLink>
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

function Badge({ count }) {
  return (
    <span
      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-hazard text-white font-mono text-[9px] flex items-center justify-center"
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
        className="font-mono text-[10px] uppercase tracking-widest border border-steel-lighter rounded px-2.5 py-1.5 text-concrete hover:border-amber hover:text-amber whitespace-nowrap"
      >
        {t('nav_start')}
      </NavLink>
    )
  }

  return (
    <NavLink
      to="/start"
      className="flex items-center gap-2 border border-steel-lighter rounded px-2.5 py-1.5 hover:border-amber max-w-[140px]"
      title={worker.name}
    >
      <Pictogram name={worker.role === ROLE.SUPERVISOR ? 'report_it' : 'ppe'} size={16} />
      <span className="font-mono text-[10px] text-chalk truncate">{worker.name}</span>
    </NavLink>
  )
}

function NotFound({ t }) {
  return (
    <div className="max-w-md mx-auto px-5 py-20 text-center">
      <Pictogram name="warning" size={48} className="mx-auto mb-5" />
      <p className="text-concrete mb-6">{t('vf_unreadable')}</p>
      <NavLink to="/" className="bg-amber text-steel font-display font-bold uppercase px-6 py-3 rounded">
        {t('nav_home')}
      </NavLink>
    </div>
  )
}
