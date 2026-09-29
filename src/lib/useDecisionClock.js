import { useCallback, useEffect, useRef, useState } from 'react'
import { createDecisionClock } from './decisionClock.js'

export function useDecisionClock(stepKey, available) {
  const clockRef = useRef(null)
  if (!clockRef.current) clockRef.current = createDecisionClock()
  const availableRef = useRef(available)
  availableRef.current = available
  const keyRef = useRef(stepKey)
  const [snapshot, setSnapshot] = useState({ ready: false, narrated: false, elapsedMs: 0 })

  const refresh = useCallback(() => {
    const clock = clockRef.current
    clock.setReady(availableRef.current && !document.hidden)
    const next = clock.snapshot()
    setSnapshot(next)
    return next
  }, [])

  useEffect(() => {
    keyRef.current = stepKey
    clockRef.current.reset()
    refresh()
  }, [stepKey, refresh])

  useEffect(() => {
    refresh()
    document.addEventListener('visibilitychange', refresh)
    const timer = setInterval(refresh, 100)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      clearInterval(timer)
    }
  }, [available, refresh])

  const narrationEnded = useCallback(() => {
    if (keyRef.current !== stepKey) return
    clockRef.current.narrationEnded()
    refresh()
  }, [stepKey, refresh])

  return { ...snapshot, narrationEnded, read: refresh }
}
