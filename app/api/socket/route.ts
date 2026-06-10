import { NextRequest, NextResponse } from 'next/server'
import * as si from 'systeminformation'
import { logEvent } from '@/lib/telemetry'

export const dynamic = 'force-dynamic'

// Store the last update time to avoid excessive polling
let lastUpdateTime = 0
const UPDATE_INTERVAL = 100 // Minimum 100ms between updates

// Mock data for fallback
function getMockMetrics() {
  const cpuUsage = 20 + Math.random() * 30
  const memUsage = 40 + Math.random() * 20

  return {
    timestamp: Date.now(),
    cpu: {
      usage: cpuUsage,
      cores: [
        { load: cpuUsage },
        { load: cpuUsage * 0.8 },
        { load: cpuUsage * 0.9 },
        { load: cpuUsage * 0.7 },
        { load: cpuUsage * 0.85 },
        { load: cpuUsage * 0.75 },
        { load: cpuUsage * 0.8 },
        { load: cpuUsage * 0.9 },
      ],
    },
    memory: {
      used: 8589934592 + Math.random() * 4294967296,
      total: 17179869184,
      usagePercent: memUsage,
    },
    disk: [
      {
        filesystem: 'C:\\',
        size: 536870912000,
        used: 268435456000 + Math.random() * 100000000000,
        usagePercent: 50 + Math.random() * 10,
        mount: 'C:\\',
      },
      {
        filesystem: 'D:\\',
        size: 1099511627776,
        used: 549755813888 + Math.random() * 200000000000,
        usagePercent: 50 + Math.random() * 15,
        mount: 'D:\\',
      },
    ],
    network: [
      {
        interface: 'Ethernet',
        rx_bytes: Math.random() * 1000000000,
        tx_bytes: Math.random() * 1000000000,
      },
      {
        interface: 'WiFi',
        rx_bytes: Math.random() * 500000000,
        tx_bytes: Math.random() * 500000000,
      },
    ],
    topProcesses: [
      {
        pid: 1234,
        name: 'chrome.exe',
        cpu: 5 + Math.random() * 8,
        mem: 12 + Math.random() * 5,
      },
      {
        pid: 5678,
        name: 'explorer.exe',
        cpu: 2 + Math.random() * 3,
        mem: 3 + Math.random() * 2,
      },
      {
        pid: 9012,
        name: 'VSCode.exe',
        cpu: 3 + Math.random() * 5,
        mem: 8 + Math.random() * 4,
      },
      {
        pid: 3456,
        name: 'node.exe',
        cpu: 4 + Math.random() * 6,
        mem: 5 + Math.random() * 3,
      },
      {
        pid: 7890,
        name: 'Spotify.exe',
        cpu: 1 + Math.random() * 2,
        mem: 4 + Math.random() * 2,
      },
    ],
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

async function getSystemMetrics() {
  const [cpuResult, memResult, diskResult, networkResult] =
    await Promise.allSettled([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
    ])

  const fallback = getMockMetrics()

  const cpu =
    cpuResult.status === 'fulfilled'
      ? (() => {
          const v: any = cpuResult.value
          // cores may be an array of numbers, or cpu objects under `cpus` with `.load`.
          if (Array.isArray(v.cores) && v.cores.length && typeof v.cores[0] === 'number') {
            return {
              usage: v.currentLoad,
              cores: v.cores.map((n: number) => ({ load: n })),
            }
          }
          if (Array.isArray(v.cpus) && v.cpus.length && typeof v.cpus[0]?.load === 'number') {
            return {
              usage: v.currentLoad,
              cores: v.cpus.map((c: any) => ({ load: c.load })),
            }
          }
          // fallback: try mapping objects in cores
          if (Array.isArray(v.cores)) {
            return {
              usage: v.currentLoad,
              cores: v.cores.map((c: any) => ({ load: c?.load ?? 0 })),
            }
          }
          return { usage: v.currentLoad, cores: [] }
        })()
      : fallback.cpu

  // Use total - available for better alignment with OS task manager style "in use" memory.
  const memory =
    memResult.status === 'fulfilled'
      ? {
          used: Math.max(memResult.value.total - memResult.value.available, 0),
          total: memResult.value.total,
          usagePercent:
            memResult.value.total > 0
              ? ((memResult.value.total - memResult.value.available) /
                  memResult.value.total) *
                100
              : 0,
        }
      : fallback.memory

  const rawDisks =
    diskResult.status === 'fulfilled' ? diskResult.value : []

  // On Windows, prefer standard drive-letter mounts to avoid virtual/system volumes.
  const windowsDriveDisks = rawDisks.filter(
    (disk) => /^[A-Z]:\\/i.test(disk.mount || '')
  )
  const disksToDisplay =
    windowsDriveDisks.length > 0
      ? windowsDriveDisks
      : rawDisks.filter((disk) => disk.size > 0)

  const disk =
    diskResult.status === 'fulfilled'
      ? disksToDisplay.map((disk) => ({
          filesystem: disk.fs,
          size: disk.size,
          used: disk.used,
          usagePercent:
            Number.isFinite(disk.use) && disk.use >= 0
              ? disk.use
              : disk.size > 0
                ? (disk.used / disk.size) * 100
                : 0,
          mount: disk.mount,
        }))
      : fallback.disk

  const network =
    networkResult.status === 'fulfilled'
      ? networkResult.value.map((net) => ({
          interface: net.iface,
          rx_bytes: net.rx_bytes,
          tx_bytes: net.tx_bytes,
        }))
      : fallback.network

  const topProcesses = await getTopProcessesCached(fallback.topProcesses)

  return {
    timestamp: Date.now(),
    cpu,
    memory,
    disk,
    network,
    topProcesses,
  }
}

async function getSystemMetricsFast() {
  const [cpuResult, memResult, networkResult] = await Promise.allSettled([
    si.currentLoad(),
    si.mem(),
    si.networkStats(),
  ])

  const fallback = getMockMetrics()

  const cpu =
    cpuResult.status === 'fulfilled'
      ? (() => {
          const v: any = cpuResult.value
          if (Array.isArray(v.cores) && v.cores.length && typeof v.cores[0] === 'number') {
            return { usage: v.currentLoad, cores: v.cores.map((n: number) => ({ load: n })) }
          }
          if (Array.isArray(v.cpus) && v.cpus.length && typeof v.cpus[0]?.load === 'number') {
            return { usage: v.currentLoad, cores: v.cpus.map((c: any) => ({ load: c.load })) }
          }
          if (Array.isArray(v.cores)) return { usage: v.currentLoad, cores: v.cores.map((c: any) => ({ load: c?.load ?? 0 })) }
          return { usage: v.currentLoad, cores: [] }
        })()
      : fallback.cpu

  const memory =
    memResult.status === 'fulfilled'
      ? {
          used: Math.max(memResult.value.total - memResult.value.available, 0),
          total: memResult.value.total,
          usagePercent:
            memResult.value.total > 0
              ? ((memResult.value.total - memResult.value.available) /
                  memResult.value.total) *
                100
              : 0,
        }
      : fallback.memory

  const network =
    networkResult.status === 'fulfilled'
      ? networkResult.value.map((net) => ({
          interface: net.iface,
          rx_bytes: net.rx_bytes,
          tx_bytes: net.tx_bytes,
        }))
      : fallback.network

  return {
    timestamp: Date.now(),
    cpu,
    memory,
    network,
  }
}

export async function GET(req: NextRequest) {
  const now = Date.now()

  if (now - lastUpdateTime < UPDATE_INTERVAL) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  lastUpdateTime = now
  const t0 = Date.now()
  try {
    const metrics = await getSystemMetricsFast()
    const duration = Date.now() - t0
    logEvent({ ts: Date.now(), source: 'fast', path: '/api/socket', durationMs: duration, status: 200 })
    return NextResponse.json(metrics)
  } catch (err: any) {
    const duration = Date.now() - t0
    logEvent({ ts: Date.now(), source: 'fast', path: '/api/socket', durationMs: duration, status: 500, error: err?.message })
    return NextResponse.json({ error: 'Failed to fetch fast metrics' }, { status: 500 })
  }
}
