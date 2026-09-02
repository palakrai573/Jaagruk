import { LS } from './local.js'

// Reads through the migrated key so history saved under the app's previous name
// survives the rename. See local.js migrateLegacyKeys().
const LOG_KEY = LS.LOG

export function getLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY)) || []
  } catch {
    return []
  }
}

export function addLogEntry(entry) {
  const log = getLog()
  log.unshift({ ...entry, timestamp: Date.now() })
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 100)))
  return log
}

export function clearLog() {
  localStorage.removeItem(LOG_KEY)
}

export function computeStats() {
  const log = getLog()
  const scans = log.filter((l) => l.type === 'scan')
  const scenarios = log.filter((l) => l.type === 'scenario')
  const avgRisk = scans.length
    ? Math.round(scans.reduce((s, e) => s + (e.riskScore || 0), 0) / scans.length)
    : 0
  const avgScenarioScore = scenarios.length
    ? Math.round(scenarios.reduce((s, e) => s + (e.score || 0), 0) / scenarios.length)
    : 0
  return {
    totalSessions: log.length,
    scans: scans.length,
    scenarios: scenarios.length,
    avgRisk,
    avgScenarioScore,
  }
}
