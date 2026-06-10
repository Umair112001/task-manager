import { NextRequest, NextResponse } from 'next/server'
import * as si from 'systeminformation'
import { logEvent } from '@/lib/telemetry'

export const dynamic = 'force-dynamic'

const PROCESS_CACHE_TTL = 5000

type TopProcess = {
  pid: number
  name: string
  cpu: number
  mem: number
}

let processCache: TopProcess[] = []
let processCacheUpdatedAt = 0
let processFetchPromise: Promise<TopProcess[]> | null = null

function getMockMetrics() {
  return {
    disk: [],
    topProcesses: [],
  }
}

async function getTopProcessesCached(fallback: TopProcess[]) {
  const now = Date.now()

  if (processCache.length > 0 && now - processCacheUpdatedAt < PROCESS_CACHE_TTL) {
    return processCache
  }

  if (processFetchPromise) {
    return processFetchPromise
  }

  processFetchPromise = si
    .processes()
    .then((processData) => {
      const topProcesses = processData.list
        .sort((a, b) => (b.mem || 0) - (a.mem || 0))
        .slice(0, 15)
        .map((proc) => ({
          pid: proc.pid,
          name: proc.name,
          cpu: proc.cpu || 0,
          mem: proc.mem || 0,
        }))

      processCache = topProcesses
      processCacheUpdatedAt = Date.now()

      return topProcesses
    })
    .catch((error) => {
      console.error('Failed to refresh process cache:', error)
      return processCache.length > 0 ? processCache : fallback
    })
    .finally(() => {
      processFetchPromise = null
    })

  return processFetchPromise
}

export async function GET(req: NextRequest) {
  try {
    const t0 = Date.now()
    const fallback = getMockMetrics()

    const diskData = await si.fsSize().catch((e) => {
      console.error('fsSize error', e)
      return []
    })

    const rawDisks = diskData || []

    const windowsDriveDisks = rawDisks.filter((disk) => /^[A-Z]:\\/i.test(disk.mount || ''))
    const disksToDisplay = windowsDriveDisks.length > 0 ? windowsDriveDisks : rawDisks.filter((d) => d.size > 0)

    const disk = disksToDisplay.map((disk) => ({
      filesystem: disk.fs,
      size: disk.size,
      used: disk.used,
      usagePercent: Number.isFinite(disk.use) && disk.use >= 0 ? disk.use : disk.size > 0 ? (disk.used / disk.size) * 100 : 0,
      mount: disk.mount,
    }))

    const topProcesses = await getTopProcessesCached(fallback.topProcesses)

    const res = NextResponse.json({ timestamp: Date.now(), disk, topProcesses })
    const duration = Date.now() - t0
    try { logEvent({ ts: Date.now(), source: 'slow', path: '/api/metrics/slow', durationMs: duration, status: 200 }) } catch {}
    return res
  } catch (error) {
    console.error('Error in slow metrics endpoint:', error)
    try { logEvent({ ts: Date.now(), source: 'slow', path: '/api/metrics/slow', durationMs: 0, status: 500, error: (error as Error).message }) } catch {}
    return NextResponse.json({ error: 'Failed to fetch slow metrics' }, { status: 500 })
  }
}
