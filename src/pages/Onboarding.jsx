import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  validateRegistration,
  registerWorker,
  listWorkers,
  login,
  logout,
  getCurrentWorker,
  lockoutRemainingMs,
  attemptsRemaining,
  getActiveSiteId,
  ROLE,
} from '../lib/identity.js'
import { LANGUAGES } from '../lib/i18n.js'
import { speak } from '../lib/speech.js'
import { LS, lsSetBool, lsGetBool } from '../lib/local.js'
import Pictogram from '../lib/pictograms.jsx'
import { Field } from '../components/ui/index.js'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * First-run flow: pick a language, then either create a worker record or sign in
 * to an existing one.
 *
 * DESIGNED FOR SOMEONE WHO CANNOT READ. The problem statement describes young
 * tribal recruits with no prior industrial exposure, many with limited formal
 * schooling. So: language selection is native-script buttons that speak
 * themselves when tapped, every step carries a pictogram, and the whole flow is
 * skippable — training works without an account, only the certificate needs a
 * named record.
 *
 * The PIN exists because a worker 300 m underground has no signal for an OTP.
 * It is verified locally against a PBKDF2 verifier. That is durable offline
 * identity, not a security boundary — see identity.js.
 */

const STAGE = { LANGUAGE: 'language', WHO: 'who', REGISTER: 'register', SIGN_IN: 'signin', DONE: 'done' }

/* PIN boxes are wide-tracked, centred and monospaced so a worker can count the
   dots. Declared once: the choose/confirm/sign-in boxes drifting apart is the
   kind of thing nobody notices until the three screens sit side by side. */
const PIN_INPUT = 'font-mono text-2xl tracking-[0.4em] text-center'

export default function Onboarding() {
  const { t, lang, setLang } = useLanguage()
  const navigate = useNavigate()

  const [stage, setStage] = useState(STAGE.LANGUAGE)
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(null)

  // registration
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [isSupervisor, setIsSupervisor] = useState(false)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)

  // sign-in
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [signInPin, setSignInPin] = useState('')
  const [signInError, setSignInError] = useState(null)
  const [lockMs, setLockMs] = useState(0)

  /* ---------------- load ---------------- */

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [list, worker] = await Promise.all([listWorkers(getActiveSiteId()), getCurrentWorker()])
      setWorkers(list)
      setCurrent(worker)
      // Someone already signed in on this device goes straight to the summary
      // rather than being asked who they are again.
      if (worker) setStage(STAGE.DONE)
      else if (lsGetBool(LS.ONBOARDED, false)) setStage(STAGE.WHO)
    } catch {
      setWorkers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Live lockout countdown, so the worker sees when they can try again instead
  // of tapping into a wall.
  useEffect(() => {
    if (!selectedWorker) return undefined
    const tick = () => setLockMs(lockoutRemainingMs(selectedWorker.id))
    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [selectedWorker])

  /* ---------------- actions ---------------- */

  const pickLanguage = (code) => {
    setLang(code)
    // Speak a sample immediately so a non-reader can confirm by ear that they
    // picked the right one.
    const sample = LANGUAGES.find((l) => l.code === code)?.native || ''
    speak(sample, code)
  }

  const confirmLanguage = () => {
    lsSetBool(LS.ONBOARDED, true)
    setStage(STAGE.WHO)
    speak(t('ob_who_are_you'), lang)
  }

  const submitRegistration = async () => {
    const found = validateRegistration({ name, phone, pin, pinConfirm })
    setErrors(found)
    if (found.length) return

    setBusy(true)
    try {
      const worker = await registerWorker({
        name,
        phone,
        pin,
        role: isSupervisor ? ROLE.SUPERVISOR : ROLE.WORKER,
        siteId: getActiveSiteId(),
      })
      // Registering signs you in — asking for the PIN again immediately would be
      // pointless friction.
      await login(worker.id, pin)
      setCurrent(worker)
      setStage(STAGE.DONE)
      setPin('')
      setPinConfirm('')
    } catch (err) {
      setErrors([err?.message || 'err_PIN_FORMAT'])
    } finally {
      setBusy(false)
    }
  }

  const submitSignIn = async () => {
    if (!selectedWorker) return
    setBusy(true)
    setSignInError(null)
    try {
      const worker = await login(selectedWorker.id, signInPin)
      setCurrent(worker)
      setSignInPin('')
      setStage(STAGE.DONE)
    } catch (err) {
      setSignInError(err?.message || 'err_PIN_WRONG')
      setLockMs(lockoutRemainingMs(selectedWorker.id))
    } finally {
      setBusy(false)
    }
  }

  const signOut = () => {
    logout()
    setCurrent(null)
    setSelectedWorker(null)
    setSignInPin('')
    setStage(STAGE.WHO)
  }

  /* ---------------- render ---------------- */

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <p className="font-mono text-xs text-ink-tertiary uppercase tracking-widest">{t('loading_label')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <StageDots stage={stage} />

      {/* ---------------- language ---------------- */}
      {stage === STAGE.LANGUAGE && (
        <section>
          <Heading pictogram="listen" title={t('ob_pick_language')} subtitle={t('ob_tap_to_hear')} />

          <div className="grid grid-cols-2 gap-3 mb-8">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => pickLanguage(l.code)}
                aria-pressed={lang === l.code}
                className={`rounded-lg border py-5 px-3 text-center transition-colors ${
                  lang === l.code
                    ? 'border-brand bg-brand-subtle text-brand-text'
                    : 'border-line-subtle text-ink hover:border-brand'
                }`}
              >
                <span className="block text-xl mb-1">{l.native}</span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-ink-tertiary">{l.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={confirmLanguage}
            className="w-full bg-brand text-ink-onBrand font-display font-bold text-lg uppercase py-4 rounded flex items-center justify-center gap-3"
          >
            <Pictogram name="correct" size={26} />
            {t('next_label')}
          </button>
        </section>
      )}

      {/* ---------------- who ---------------- */}
      {stage === STAGE.WHO && (
        <section>
          <Heading pictogram="ppe" title={t('ob_who_are_you')} />

          <div className="grid gap-3 mb-6">
            <BigChoice
              pictogram="ppe"
              label={t('ob_new_worker')}
              onClick={() => {
                setErrors([])
                setStage(STAGE.REGISTER)
                speak(t('ob_your_name'), lang)
              }}
            />
            <BigChoice
              pictogram="buddy"
              label={t('ob_existing_worker')}
              disabled={workers.length === 0}
              hint={workers.length === 0 ? t('ob_no_workers') : `${workers.length}`}
              onClick={() => {
                setSignInError(null)
                setStage(STAGE.SIGN_IN)
                speak(t('ob_select_worker'), lang)
              }}
            />
          </div>

          <GuestExit t={t} />
        </section>
      )}

      {/* ---------------- register ---------------- */}
      {stage === STAGE.REGISTER && (
        <section>
          <Heading pictogram="ppe" title={t('ob_new_worker')} />

          {/* size="field" is what makes these 56px rather than the 42px default.
              Registration happens at the gate with gloves on, so the control
              classes come from the primitive; only the PIN boxes add a treatment
              on top, appended to wiring.className rather than replacing it. */}
          <Field label={t('ob_your_name')} size="field">
            {(wiring) => (
              <input
                {...wiring}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('ob_name_placeholder')}
                autoComplete="name"
              />
            )}
          </Field>

          <Field label={t('ob_phone_optional')} hint={t('ob_phone_why')} size="field">
            {(wiring) => (
              <input
                {...wiring}
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                autoComplete="tel"
                className={`${wiring.className} font-mono`}
              />
            )}
          </Field>

          <Field label={t('ob_choose_pin')} hint={t('ob_pin_why')} size="field">
            {(wiring) => (
              <input
                {...wiring}
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                autoComplete="new-password"
                className={`${wiring.className} ${PIN_INPUT}`}
              />
            )}
          </Field>

          <Field label={t('ob_confirm_pin')} size="field">
            {(wiring) => (
              <input
                {...wiring}
                type="password"
                inputMode="numeric"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                autoComplete="new-password"
                className={`${wiring.className} ${PIN_INPUT}`}
              />
            )}
          </Field>

          {/* The whole row is the tap target, padded to the field-tier minimum —
              a bare 20px checkbox is a missed tap with gloves on. */}
          <label className="flex items-center gap-3 mb-6 cursor-pointer min-h-touch -mx-2 px-2 rounded-lg hover:bg-surface-1">
            <input
              type="checkbox"
              checked={isSupervisor}
              onChange={(e) => setIsSupervisor(e.target.checked)}
              className="w-6 h-6 accent-brand shrink-0"
            />
            <span className="text-sm text-ink-tertiary">{t('site_eyebrow')}</span>
          </label>

          <ErrorList errors={errors} t={t} />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStage(STAGE.WHO)}
              className="border border-line rounded px-5 py-3 font-mono text-sm hover:border-brand hover:text-brand-text"
            >
              {t('back_label')}
            </button>
            <button
              type="button"
              onClick={submitRegistration}
              disabled={busy}
              className="flex-1 bg-brand text-ink-onBrand font-display font-bold text-lg uppercase py-3 rounded disabled:opacity-50"
            >
              {busy ? t('loading_label') : t('ob_create_account')}
            </button>
          </div>
        </section>
      )}

      {/* ---------------- sign in ---------------- */}
      {stage === STAGE.SIGN_IN && (
        <section>
          <Heading pictogram="buddy" title={selectedWorker ? t('ob_enter_pin') : t('ob_select_worker')} />

          {!selectedWorker && (
            <div className="grid gap-2 mb-6">
              {workers.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedWorker(w)
                    setSignInError(null)
                    setSignInPin('')
                  }}
                  className="w-full text-start bg-surface-1 border border-line-subtle rounded-lg p-4 hover:border-brand flex items-center gap-4"
                >
                  <Pictogram name={w.role === ROLE.SUPERVISOR ? 'report_it' : 'ppe'} size={32} />
                  <span className="min-w-0">
                    <span className="block font-bold text-sm truncate">{w.name}</span>
                    {w.phone && <span className="block font-mono text-[11px] text-ink-tertiary">{w.phone}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedWorker && (
            <>
              <div className="bg-surface-1 border border-line-subtle rounded-lg p-4 mb-6 flex items-center gap-4">
                <Pictogram name={selectedWorker.role === ROLE.SUPERVISOR ? 'report_it' : 'ppe'} size={34} />
                <span className="font-bold">{selectedWorker.name}</span>
              </div>

              <Field label={t('ob_enter_pin')} size="field">
                {(wiring) => (
                  <input
                    {...wiring}
                    type="password"
                    inputMode="numeric"
                    value={signInPin}
                    onChange={(e) => setSignInPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitSignIn()
                    }}
                    placeholder="••••"
                    autoComplete="current-password"
                    autoFocus
                    className={`${wiring.className} ${PIN_INPUT}`}
                  />
                )}
              </Field>

              {signInError && (
                <div className="bg-hazard/10 border border-hazard/40 rounded p-3 mb-4">
                  <p className="text-xs text-hazard">{t(`err_${signInError}`)}</p>
                  {signInError === 'PIN_WRONG' && (
                    <p className="font-mono text-[10px] text-ink-tertiary mt-1">
                      {attemptsRemaining(selectedWorker.id)} {t('err_attempts_left')}
                    </p>
                  )}
                </div>
              )}

              {lockMs > 0 && (
                <p className="font-mono text-[11px] text-hazard text-center mb-4">
                  {t('err_LOCKED_OUT')} {Math.ceil(lockMs / 1000)}s
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWorker(null)
                    setSignInError(null)
                  }}
                  className="border border-line rounded px-5 py-3 font-mono text-sm hover:border-brand hover:text-brand-text"
                >
                  {t('back_label')}
                </button>
                <button
                  type="button"
                  onClick={submitSignIn}
                  disabled={busy || lockMs > 0 || signInPin.length < 4}
                  className="flex-1 bg-brand text-ink-onBrand font-display font-bold text-lg uppercase py-3 rounded disabled:opacity-50"
                >
                  {busy ? t('loading_label') : t('ob_sign_in')}
                </button>
              </div>
            </>
          )}

          {!selectedWorker && (
            <button
              type="button"
              onClick={() => setStage(STAGE.WHO)}
              className="w-full border border-line rounded px-5 py-3 font-mono text-sm hover:border-brand hover:text-brand-text"
            >
              {t('back_label')}
            </button>
          )}
        </section>
      )}

      {/* ---------------- done ---------------- */}
      {stage === STAGE.DONE && current && (
        <section className="text-center">
          <Pictogram name="correct" size={64} className="mx-auto mb-5" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary mb-2">{t('ob_signed_in_as')}</p>
          <h1 className="font-display font-bold text-3xl uppercase mb-1">{current.name}</h1>
          {current.role === ROLE.SUPERVISOR && (
            <p className="font-mono text-[11px] text-brand-text mb-6">{t('site_eyebrow')}</p>
          )}

          <div className="grid gap-3 mt-8">
            <button
              type="button"
              onClick={() => navigate('/train')}
              className="w-full bg-brand text-ink-onBrand font-display font-bold text-lg uppercase py-4 rounded"
            >
              {t('home_cta_train')}
            </button>
            <Link
              to="/certification"
              className="w-full border border-line rounded py-3 font-mono text-sm hover:border-brand hover:text-brand-text"
            >
              {t('nav_cert')}
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="font-mono text-[11px] text-ink-tertiary hover:text-hazard underline mt-2"
            >
              {t('ob_sign_out')}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

/* ================================================================== */
/* Local pieces                                                        */
/* ================================================================== */

function StageDots({ stage }) {
  const order = [STAGE.LANGUAGE, STAGE.WHO, STAGE.REGISTER, STAGE.DONE]
  const activeIndex = stage === STAGE.SIGN_IN ? 2 : order.indexOf(stage)
  return (
    <div className="flex gap-2 justify-center mb-8" aria-hidden="true">
      {order.map((s, i) => (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all ${i <= activeIndex ? 'bg-brand w-8' : 'bg-surface-3 w-4'}`}
        />
      ))}
    </div>
  )
}

function Heading({ pictogram, title, subtitle }) {
  return (
    <div className="text-center mb-8">
      <Pictogram name={pictogram} size={52} className="mx-auto mb-4" />
      <h1 className="font-display font-bold text-2xl uppercase leading-tight">{title}</h1>
      {subtitle && <p className="text-ink-tertiary text-sm mt-2">{subtitle}</p>}
    </div>
  )
}

function BigChoice({ pictogram, label, onClick, disabled, hint }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full text-start rounded-lg border p-5 flex items-center gap-4 transition-colors ${
        disabled
          ? 'border-line-subtle opacity-50 cursor-default'
          : 'border-line-subtle hover:border-brand bg-surface-1'
      }`}
    >
      <Pictogram name={pictogram} size={44} />
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        {hint && <span className="block font-mono text-[11px] text-ink-tertiary mt-0.5">{hint}</span>}
      </span>
    </button>
  )
}

// A local Field used to live here. It rendered a <label> with NO htmlFor while the
// inputs had no id, so every field on this screen was visually labelled and
// programmatically anonymous — a screen reader announced "edit text, blank". On the
// registration form of an app whose whole premise includes workers who cannot read,
// that was the worst possible place for it.
//
// Replaced by the shared Field primitive, which generates the id and hands it to
// the control through a render prop, so a call site cannot forget the association.

function ErrorList({ errors, t }) {
  if (!errors?.length) return null
  return (
    <div
      role="alert"
      className="bg-hazard-subtle border border-hazard-border rounded-xl p-3 mb-4 space-y-1"
    >
      {errors.map((code) => (
        <p key={code} className="text-xs text-hazard flex items-start gap-2">
          <Pictogram name="warning" size={16} />
          {t(`err_${code}`)}
        </p>
      ))}
    </div>
  )
}

function GuestExit({ t }) {
  return (
    <div className="text-center border-t border-line-subtle pt-6">
      <Link to="/train" className="font-mono text-xs text-ink-tertiary hover:text-brand-text underline">
        {t('ob_continue_guest')}
      </Link>
      <p className="text-[11px] text-ink-tertiary mt-2 leading-relaxed">{t('ob_guest_note')}</p>
    </div>
  )
}
