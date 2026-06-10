import { NextRequest, NextResponse } from 'next/server'
import { getEvents, clearEvents, exportEvents } from '@/lib/telemetry'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const TELEMETRY_DIR = path.resolve(process.cwd(), '.telemetry')
const TELEMETRY_FILE = path.join(TELEMETRY_DIR, 'events.jsonl')

function findTelemetryFile(): { file?: string; checked: string[] } {
  const checked: string[] = []
  let cur = process.cwd()
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(cur, '.telemetry', 'events.jsonl')
    checked.push(candidate)
    if (fs.existsSync(candidate)) return { file: candidate, checked }
    cur = path.dirname(cur)
  }
  // try __dirname as fallback
  try {
    // @ts-ignore
    let dir = __dirname
    for (let i = 0; i < 6; i++) {
      const candidate = path.join(dir, '.telemetry', 'events.jsonl')
      checked.push(candidate)
      if (fs.existsSync(candidate)) return { file: candidate, checked }
      dir = path.dirname(dir)
    }
  } catch (e) {}
  return { checked }
}

export async function GET(req: NextRequest) {
  try {
    const found = findTelemetryFile()
    if (found.file) {
      const data = await fs.promises.readFile(found.file, 'utf8')
      const lines = data.split(/\r?\n/).filter(Boolean)
      const events = lines.map((l) => JSON.parse(l))
      return NextResponse.json({ events, file: found.file, exists: true, checked: found.checked })
    }
  } catch (e) {
    // fall through to in-memory
  }

  const events = getEvents()
  return NextResponse.json({ events, file: TELEMETRY_FILE, exists: false })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body.action === 'clear') {
    clearEvents()
    return NextResponse.json({ success: true })
  }
  if (body.action === 'export') {
    const content = exportEvents()
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="telemetry-${Date.now()}.json"`,
      },
    })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
