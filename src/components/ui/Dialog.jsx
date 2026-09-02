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

export default Dialog
