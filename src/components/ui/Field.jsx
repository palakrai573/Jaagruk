import { useId } from 'react'

// Form field.
//
// WHY THE WRAPPER OWNS THE ID
// Every field generates an id and wires label/input/hint/error together with
// aria-describedby and aria-invalid. Left to each call site, one of those links
// gets forgotten and the error text becomes invisible to a screen reader — which
// on a PIN registration screen means a worker who cannot see is told nothing about
// why registration failed.
//
// FIELD-TIER SIZING
// `size="field"` gives a 56px control. Onboarding and hazard reporting are used
// with gloves on, and a 40px input is a missed tap.

const CONTROL_BASE =
  'w-full bg-surface-inset border rounded-lg text-ink placeholder:text-ink-disabled ' +
  'transition-colors duration-fast outline-none ' +
  'focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

const SIZES = {
  md: 'px-4 py-2.5 text-base min-h-[42px]',
  field: 'px-4 py-4 text-lg min-h-touch',
}

export function Field({
  label,
  hint,
  error,
  required = false,
  counter = null,
  size = 'md',
  className = '',
  children,
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={`mb-4 ${className}`}>
      {label ? (
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <label
            htmlFor={id}
            className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary"
          >
            {label}
            {required ? (
              <span className="text-hazard-text ms-1" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
          {counter ? <span className="font-mono text-2xs text-ink-disabled tabular-nums">{counter}</span> : null}
        </div>
      ) : null}

      {/* Children receive the wiring, so a call site cannot forget it. */}
      {typeof children === 'function'
        ? children({
            id,
            'aria-describedby': describedBy,
            'aria-invalid': error ? true : undefined,
            'aria-required': required || undefined,
            className: `${CONTROL_BASE} ${SIZES[size] || SIZES.md} ${
              error ? 'border-hazard' : 'border-line'
            }`,
          })
        : children}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-tertiary mt-1.5 leading-relaxed">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-hazard-text mt-1.5 leading-relaxed">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Convenience wrappers for the common cases. */
export function TextField({ label, hint, error, required, counter, size, className, ...inputProps }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} counter={counter} size={size} className={className}>
      {(wiring) => <input {...wiring} {...inputProps} />}
    </Field>
  )
}

export function TextAreaField({ label, hint, error, required, counter, size, rows = 3, className, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} counter={counter} size={size} className={className}>
      {(wiring) => <textarea {...wiring} rows={rows} className={`${wiring.className} resize-y`} {...props} />}
    </Field>
  )
}

export default Field
