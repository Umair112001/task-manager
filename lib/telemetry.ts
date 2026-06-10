import fs from 'fs'
import path from 'path'

type TelemetryEvent = {
  ts: number
  source: 'fast' | 'slow' | 'process' | 'other'
  path: string
  durationMs: number
  status: number
  error?: string
  meta?: Record<string, any>
}

const MAX_EVENTS = 2000
let events: TelemetryEvent[] = []

const TELEMETRY_DIR = path.resolve(process.cwd(), '.telemetry')
const TELEMETRY_FILE = path.join(TELEMETRY_DIR, 'events.jsonl')

function ensureDir() {
  try {
    if (!fs.existsSync(TELEMETRY_DIR)) fs.mkdirSync(TELEMETRY_DIR)
  } catch (e) {
    // ignore
  }
}

function loadFromFile() {
  try {
    if (!fs.existsSync(TELEMETRY_FILE)) return
    const data = fs.readFileSync(TELEMETRY_FILE, 'utf8')
    const lines = data.split(/\r?\n/).filter(Boolean)
    events = lines.map((l) => JSON.parse(l)).slice(-MAX_EVENTS)
  } catch (e) {
    // ignore parse errors
  }
}

function appendToFile(e: TelemetryEvent) {
  try {
    ensureDir()
    fs.appendFile(TELEMETRY_FILE, JSON.stringify(e) + '\n', () => {})
  } catch (err) {
    // ignore
  }
}

// initialize from disk so events survive across worker instances
loadFromFile()

export function logEvent(e: TelemetryEvent) {
  events.push(e)
  if (events.length > MAX_EVENTS) events.shift()
  appendToFile(e)
}

export function getEvents() {
  return [...events]
}

export function clearEvents() {
  events = []
  try {
    if (fs.existsSync(TELEMETRY_FILE)) fs.unlinkSync(TELEMETRY_FILE)
  } catch (e) {}
}

export function exportEvents(): string {
  return JSON.stringify(events, null, 2)
}

export type { TelemetryEvent }
