// Both counters use monotonic time. Reading ahead remains valid, while listeners
// are measured only after narration. Neither counter includes unavailable time.
export function createDecisionClock(now = () => performance.now()) {
  let last = now()
  let ready = false
  let narrated = false
  let readingMs = 0
  let listeningMs = 0

  function settle() {
    const current = now()
    const delta = Math.max(0, current - last)
    if (ready) {
      readingMs += delta
      if (narrated) listeningMs += delta
    }
    last = current
  }

  return {
    reset() {
      last = now()
      ready = false
      narrated = false
      readingMs = 0
      listeningMs = 0
    },
    setReady(value) {
      settle()
      ready = !!value
    },
    narrationEnded() {
      settle()
      narrated = true
    },
    snapshot() {
      settle()
      return { ready, narrated, elapsedMs: narrated ? listeningMs : readingMs }
    },
  }
}
