import { Component } from 'react'

/*
 * The last line of defence, and it was missing.
 *
 * WHY THIS MATTERS MORE HERE THAN IN AN ORDINARY APP
 * React unmounts the entire tree when a render throws and nothing catches it. There
 * was no boundary anywhere in this app, so every possible bug — one null dereference
 * in one branch of one page — had the same consequence: a blank white screen, no
 * message, no way back, nothing to report. That is how the drill crash surfaced: a
 * stale voice handler pushed the step index past the end, `step` became null, the
 * prompt dereferenced it, and a worker mid-assessment was left holding a white
 * rectangle.
 *
 * For a safety training app used on a shift, "the screen went white" is close to the
 * worst failure mode available. It cannot be recovered from, cannot be described to
 * anyone, and destroys confidence in everything else the app says.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * It does not try to recover the crashed subtree. React makes no guarantee about the
 * state of a component that threw mid-render, and silently continuing a scored
 * assessment on top of unknown state is worse than stopping — the score would be
 * quietly wrong rather than visibly missing. So it stops, says so, and offers the two
 * things that are always safe: reload, or go somewhere else.
 *
 * It is also a class component, which nothing else in this codebase is. There is no
 * hook equivalent: componentDidCatch and getDerivedStateFromError have no functional
 * form.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    /*
     * Kept on the instance and shown on screen rather than only logged.
     *
     * This runs on a phone, often offline, with no console open and no way to attach
     * one. A message the user can read out or screenshot is the only diagnostic that
     * actually reaches a developer, so the detail is rendered — behind a disclosure,
     * because a stack trace is not the first thing a worker should see.
     */
    this.componentStack = info?.componentStack || ''
    try {
      // Still logged, for the case where someone IS looking at a console.
      console.error('Jaagruk crashed:', error, info)
    } catch {
      /* a console that throws must not become the second crash */
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    /*
     * Deliberately not translated, and that is a judgement rather than an oversight.
     * This renders because part of the app is in an unknown state; reaching into the
     * i18n layer and the language context from here risks the boundary itself throwing,
     * which would take the whole tree down with nothing left to catch it. English plus
     * the two pictogram-free actions is the version most likely to actually render.
     */
    return (
      <div
        role="alert"
        className="min-h-dvh flex items-center justify-center px-5 py-16 bg-surface-0 text-ink"
      >
        <div className="max-w-md w-full">
          <p className="font-mono text-2xs uppercase tracking-widest text-hazard-text mb-3">
            Something broke
          </p>
          <h1 className="font-display font-bold text-2xl uppercase tracking-tight mb-4">
            This screen stopped working
          </h1>
          <p className="text-sm text-ink-secondary leading-relaxed mb-2">
            Nothing you did caused this, and your saved records are untouched. Any drill in
            progress was not scored — start it again.
          </p>
          <p className="text-sm text-ink-secondary leading-relaxed mb-6">
            If you can, screenshot the details below and send them on. It is the only way
            this gets fixed.
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-brand text-ink-onBrand font-display font-bold uppercase tracking-wide
                         px-5 min-h-touch rounded-lg hover:bg-brand-hover transition-colors duration-fast"
            >
              Reload
            </button>
            {/*
              A full reload rather than a router navigation. The router lives inside the
              tree that just threw, so pushing a route would re-render the same broken
              state; replacing the location rebuilds from scratch. HashRouter means the
              fragment is the route, so this lands on the home screen.
            */}
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/'
                window.location.reload()
              }}
              className="border border-line rounded-lg px-5 min-h-touch font-display font-bold
                         uppercase tracking-wide hover:border-brand hover:text-brand-text
                         transition-colors duration-fast"
            >
              Home
            </button>
          </div>

          <details className="border border-line-subtle rounded-lg bg-surface-2">
            <summary className="cursor-pointer px-4 py-3 font-mono text-xs text-ink-secondary min-h-[44px] flex items-center">
              Details
            </summary>
            <pre className="px-4 pb-4 font-mono text-[10px] leading-relaxed text-ink-tertiary whitespace-pre-wrap break-words">
              {String(error?.message || error)}
              {this.componentStack ? `\n${this.componentStack.trim()}` : ''}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
