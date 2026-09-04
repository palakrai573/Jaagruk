import { useState, useCallback, useRef } from 'react'
import { useFocusTrap, useScrollLock, useEscape } from './motion.js'
import Button from './Button.jsx'

// Dialog, and a promise-based confirm to replace window.confirm.
//
// WHY REPLACE window.confirm AT ALL
// Four call sites used it: deleting a zone (which destroys every anchor in it),
// clearing the activity log, trusting an unknown signer on import, and a reset.
// Three problems with the native dialog here:
//
//   1. It cannot be translated. The buttons are whatever the OS locale says, so a
//      Santali or Urdu user gets English "OK / Cancel" in the middle of a
//      translated flow.
//   2. It cannot be styled, so it looks like a browser artefact rather than part
//      of the product.
//   3. It blocks the main thread. During a timed drill that is a real problem.
//
// It also cannot distinguish a destructive action from a routine one, and
// "trusting a new signer" deserves visibly more weight than "clear the log".

export function Dialog({
  open,
  onClose,
  title,
  body,
  children,
  tone = 'neutral',
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmDisabled = false,
  busy = false,
  dismissible = true,
}) {
  const containerRef = useFocusTrap(open)
  useScrollLock(open)
  useEscape(open && dismissible, onClose)

  if (!open) return null

  const destructive = tone === 'danger'

  return (
    <div className="fixed inset-0 z-sheet flex items-end sm:items-center justify-center p-0 sm:p-5">
      {/* Backdrop. A button rather than a div so it is reachable and announced,
          and skipped entirely when the dialog must be acknowledged. */}
      <button
        type="button"
        tabIndex={dismissible ? 0 : -1}
        aria-label={cancelLabel || 'Close'}
        onClick={dismissible ? onClose : undefined}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm fade-in cursor-default"
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        tabIndex={-1}
        className="relative w-full sm:max-w-md bg-surface-2 border border-line rounded-t-2xl sm:rounded-2xl
                   shadow-4 rise-in max-h-[90dvh] overflow-y-auto
                   pb-[env(safe-area-inset-bottom)] sm:pb-0"
      >
        {/* Grab affordance: on a phone this opens as a bottom sheet, and the
            handle is what tells the user it is a sheet rather than a new page. */}
        <div className="sm:hidden flex justify-center pt-3" aria-hidden="true">
          <span className="w-10 h-1 rounded-full bg-line" />
        </div>

        <div className="p-5 sm:p-6">
          {title ? (
            <h2
              id="dialog-title"
              className={`font-display font-bold text-xl uppercase tracking-tight mb-3 ${
                destructive ? 'text-hazard-text' : 'text-ink'
              }`}
            >
              {title}
            </h2>
          ) : null}

          {body ? <p className="text-sm text-ink-secondary leading-relaxed">{body}</p> : null}
          {children ? <div className={body ? 'mt-4' : ''}>{children}</div> : null}
        </div>

        {(confirmLabel || cancelLabel) && (
          <div
            className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 sm:px-6 pb-5 sm:pb-6
                       border-t border-line-subtle pt-4"
          >
            {cancelLabel ? (
              <Button variant="ghost" size="md" onClick={onClose} disabled={busy} className="sm:w-auto w-full">
                {cancelLabel}
              </Button>
            ) : null}
            {confirmLabel ? (
              <Button
                variant={destructive ? 'danger' : 'primary'}
                size="md"
                onClick={onConfirm}
                loading={busy}
                disabled={confirmDisabled}
                className="sm:w-auto w-full"
              >
                {confirmLabel}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Promise-based confirm, so a call site reads almost like the native one it
 * replaces:
 *
 *   const { confirm, dialogProps } = useConfirm()
 *   ...
 *   if (!(await confirm({ title, body, confirmLabel, cancelLabel, tone }))) return
 *   ...
 *   <Dialog {...dialogProps} />
 *
 * The resolver is held in a ref rather than state because resolving must not
 * depend on a re-render having happened first.
 */
export function useConfirm() {
  const [state, setState] = useState({ open: false, options: {} })
  const resolverRef = useRef(null)

  const confirm = useCallback((options = {}) => {
    setState({ open: true, options })
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = useCallback((result) => {
    setState({ open: false, options: {} })
    const resolve = resolverRef.current
    resolverRef.current = null
    resolve?.(result)
  }, [])

  return {
    confirm,
    dialogProps: {
      open: state.open,
      ...state.options,
      onClose: () => settle(false),
      onConfirm: () => settle(true),
    },
  }
}

/**
 * Promise-based text prompt, replacing window.prompt.
 *
 * Same reasons as useConfirm — untranslatable, unstyleable, main-thread blocking —
 * plus one more that matters here: window.prompt cannot validate. Renaming a zone
 * to an empty string, or to 200 characters, was accepted silently. This trims,
 * enforces a length, and keeps the confirm button disabled until the value is
 * usable, so the failure is prevented rather than reported.
 *
 *   const { prompt, dialogProps } = usePrompt()
 *   const name = await prompt({ title, initial: zone.name, confirmLabel, cancelLabel })
 *   if (name === null) return   // cancelled, distinct from empty
 */
export function usePrompt() {
  const [state, setState] = useState({ open: false, options: {}, value: '' })
  const resolverRef = useRef(null)

  const prompt = useCallback((options = {}) => {
    setState({ open: true, options, value: options.initial ?? '' })
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = useCallback((result) => {
    setState({ open: false, options: {}, value: '' })
    const resolve = resolverRef.current
    resolverRef.current = null
    resolve?.(result)
  }, [])

  const { maxLength = 60, minLength = 1 } = state.options
  const trimmed = state.value.trim()
  const valid = trimmed.length >= minLength && trimmed.length <= maxLength

  return {
    prompt,
    value: state.value,
    valid,
    dialogProps: {
      open: state.open,
      title: state.options.title,
      body: state.options.body,
      confirmLabel: state.options.confirmLabel,
      cancelLabel: state.options.cancelLabel,
      // Cancel resolves null; an empty confirm is impossible because the button
      // is disabled. So null unambiguously means "the user backed out".
      onClose: () => settle(null),
      onConfirm: () => (valid ? settle(trimmed) : undefined),
      confirmDisabled: !valid,
      children: (
        <div>
          <input
            type="text"
            value={state.value}
            onChange={(e) => setState((s) => ({ ...s, value: e.target.value.slice(0, maxLength) }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && valid) settle(trimmed)
            }}
            maxLength={maxLength}
            autoFocus
            aria-label={state.options.title || ''}
            className="w-full bg-surface-inset border border-line rounded-lg px-4 py-3 text-base text-ink
                       placeholder:text-ink-disabled outline-none focus:border-brand
                       focus-visible:outline-2 focus-visible:outline-offset-1 min-h-touch"
          />
          <p className="font-mono text-2xs text-ink-tertiary mt-2 text-end tabular-nums">
            {trimmed.length}/{maxLength}
          </p>
        </div>
      ),
    },
  }
}

export default Dialog
