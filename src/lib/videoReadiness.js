// A live track is not proof of live pictures: USB cameras can stall without ending.
export function monitorVideoReadiness(video, onReady, {
  now = () => performance.now(),
  hidden = () => document.hidden,
  schedule = callback => setInterval(callback, 200),
  cancel = clearInterval,
  staleAfterMs = 1500,
} = {}) {
  let stopped = false
  let frameHandle = null
  let lastFrameAt = -Infinity
  let lastMediaTime = video.currentTime
  let ready = false
  const publish = next => {
    if (next !== ready) { ready = next; onReady(next) }
  }
  const frame = () => {
    if (stopped) return
    lastFrameAt = now()
    frameHandle = video.requestVideoFrameCallback(frame)
  }
  if (typeof video.requestVideoFrameCallback === 'function') frameHandle = video.requestVideoFrameCallback(frame)
  const tick = () => {
    if (stopped) return
    if (frameHandle === null && video.currentTime !== lastMediaTime) {
      lastMediaTime = video.currentTime
      lastFrameAt = now()
    }
    const tracks = video.srcObject?.getVideoTracks?.() || []
    const live = tracks.some(track => track.readyState === 'live' && !track.muted && track.enabled)
    publish(!hidden() && !video.paused && video.readyState >= 2 && video.videoWidth > 0 &&
      live && now() - lastFrameAt < staleAfterMs)
  }
  const timer = schedule(tick)
  return () => {
    stopped = true
    cancel(timer)
    if (frameHandle !== null) video.cancelVideoFrameCallback?.(frameHandle)
    publish(false)
  }
}
