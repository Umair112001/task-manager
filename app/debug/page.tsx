'use client'

import { useEffect, useState } from 'react'
import { useSystemMetrics } from '@/lib/hooks/useSystemMetrics'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

function formatMs(ms: number | null) {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

type DataPoint = { time: string; cpu: number; memory: number }

export default function DebugPage() {
  const { metrics, loading, error } = useSystemMetrics()
  const [fastLatency, setFastLatency] = useState<number | null>(null)
  const [slowLatency, setSlowLatency] = useState<number | null>(null)
  const [fastRaw, setFastRaw] = useState<any>(null)
  const [slowRaw, setSlowRaw] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [sampleWindow, setSampleWindow] = useState<number | 'all'>(60)

  const pushSample = (sample: any) => {
    setHistory((h) => {
      const next = [...h, sample]
      if (next.length > 1000) next.shift()
      return next
    })
  }

  const [history, setHistory] = useState<DataPoint[]>([])
  const [topN, setTopN] = useState(10)
  const [minMem, setMinMem] = useState(0)

  useEffect(() => {
    if (!metrics) return
    const time = new Date(metrics.timestamp || Date.now()).toLocaleTimeString()
    const cpu = metrics.cpu?.usage ?? 0
    const memory = metrics.memory?.usagePercent ?? 0
    setHistory((h) => [...h, { time, cpu, memory }].slice(-120))
  }, [metrics])

  useEffect(() => {
    let mounted = true
    const measure = async () => {
      try {
        const t0 = performance.now()
        const r1 = await fetch('/api/socket')
        const t1 = performance.now()
        const data1 = await r1.json()
        if (mounted) {
          setFastLatency(Math.round(t1 - t0))
          setFastRaw(data1)
        }
      } catch (e) {
        if (mounted) setFastRaw({ error: (e as Error).message })
      }

      try {
        const t0 = performance.now()
        const r2 = await fetch('/api/metrics/slow')
        const t1 = performance.now()
        const data2 = await r2.json()
        if (mounted) {
          setSlowLatency(Math.round(t1 - t0))
          setSlowRaw(data2)
        }
      } catch (e) {
        if (mounted) setSlowRaw({ error: (e as Error).message })
      }
      // combine sample and push to history
      if (mounted) {
        const sample = {
          ts: Date.now(),
          fastLatency: fastLatency ?? null,
          slowLatency: slowLatency ?? null,
          cpu: metrics?.cpu?.usage ?? fastRaw?.cpu?.usage ?? fastRaw?.cpu?.usage,
          memory: metrics?.memory?.usagePercent ?? fastRaw?.memory?.usagePercent ?? null,
          fastRaw,
          slowRaw,
          combined: metrics ?? null,
        }

        pushSample(sample)
      }
    }

    measure()
    const id = setInterval(measure, 5000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  const filteredProcesses = (slowRaw?.topProcesses || []).filter((p: any) => (p.mem ?? 0) >= minMem).slice(0, topN)

  const downloadLogs = () => {
    const payload = {
      timestamp: Date.now(),
      fastLatency,
      slowLatency,
      fastRaw,
      slowRaw,
      metrics,
      history,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metrics-debug-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Debug Metrics</h1>

      <div className="flex gap-2 items-center mb-4">
        <button onClick={downloadLogs} className="px-3 py-2 bg-accent text-accent-foreground rounded">Download Logs</button>
        <div className="text-sm text-muted-foreground">Loading: {loading ? 'yes' : 'no'}</div>
        <div className="text-sm text-muted-foreground">Error: {error ?? '—'}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-2">CPU / Memory (history)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(255 255 255 / 0.04)" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cpu" stroke="#3b82f6" dot={false} name="CPU %" />
                <Line type="monotone" dataKey="memory" stroke="#ec4899" dot={false} name="Memory %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Endpoints</h2>
          <p className="text-sm text-muted-foreground mb-2">Fast latency: {formatMs(fastLatency)}</p>
          <p className="text-sm text-muted-foreground mb-2">Slow latency: {formatMs(slowLatency)}</p>
          <p className="text-sm text-muted-foreground mb-2">Fast timestamp: {fastRaw?.timestamp ? new Date(fastRaw.timestamp).toLocaleString() : '—'}</p>
          <p className="text-sm text-muted-foreground mb-2">Slow timestamp: {slowRaw?.timestamp ? new Date(slowRaw.timestamp).toLocaleString() : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Top Processes (filters)</h2>
          <div className="flex gap-2 items-center mb-3">
            <label className="text-sm">Top N:</label>
            <select value={topN} onChange={(e) => setTopN(Number(e.target.value))} className="bg-muted/10 p-1 rounded">
              {[5,10,15,20].map(n => (<option key={n} value={n}>{n}</option>))}
            </select>
            <label className="text-sm">Min MEM (%):</label>
            <input type="number" value={minMem} onChange={(e) => setMinMem(Number(e.target.value))} className="w-20 bg-muted/10 p-1 rounded" />
          </div>

          <div className="overflow-auto max-h-64 text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th>PID</th>
                  <th>Name</th>
                  <th>CPU %</th>
                  <th>MEM %</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.map((p: any) => (
                  <tr key={p.pid} className="border-t border-border/50">
                    <td className="py-1">{p.pid}</td>
                    <td className="py-1">{p.name}</td>
                    <td className="py-1">{(p.cpu ?? 0).toFixed ? (p.cpu).toFixed(1) : p.cpu}</td>
                    <td className="py-1">{(p.mem ?? 0).toFixed ? (p.mem).toFixed(1) : p.mem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Raw JSON</h2>
          <div className="mb-3">
            <h3 className="font-medium">/api/socket</h3>
            <pre className="text-xs overflow-auto max-h-48 bg-muted/10 p-2 rounded">{JSON.stringify(fastRaw, null, 2)}</pre>
          </div>
          <div>
            <h3 className="font-medium">/api/metrics/slow</h3>
            <pre className="text-xs overflow-auto max-h-48 bg-muted/10 p-2 rounded">{JSON.stringify(slowRaw, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
