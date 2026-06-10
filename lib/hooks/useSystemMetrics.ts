'use client'

import { useState, useEffect, useRef } from 'react'

interface SystemMetrics {
  timestamp: number
  cpu: {
    usage: number
    cores: Array<{ load: number }>
  }
  memory: {
    used: number
    total: number
    usagePercent: number
  }
  disk: Array<{
    filesystem: string
    size: number
    used: number
    usagePercent: number
    mount: string
  }>
  network: Array<{
    interface: string
    rx_bytes: number
    tx_bytes: number
  }>
  topProcesses: Array<{
    pid: number
    name: string
    cpu: number
    mem: number
  }>
}

export function useSystemMetrics(fastInterval: number = 1000, slowInterval: number = 5000) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fastTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const slowTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fastInFlight = useRef(false)
  const slowInFlight = useRef(false)

  const fastDataRef = useRef<any>(null)
  const slowDataRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    const scheduleFast = () => {
      if (cancelled) return
      fastTimeoutRef.current = setTimeout(fetchFast, fastInterval)
    }

    const scheduleSlow = () => {
      if (cancelled) return
      slowTimeoutRef.current = setTimeout(fetchSlow, slowInterval)
    }

    const combineAndSet = () => {
      const fast = fastDataRef.current
      const slow = slowDataRef.current
      if (!fast && !slow) return

      const combined = {
        timestamp: fast?.timestamp || slow?.timestamp || Date.now(),
        cpu: fast?.cpu || { usage: 0, cores: [] },
        memory: fast?.memory || { used: 0, total: 0, usagePercent: 0 },
        network: fast?.network || [],
        disk: slow?.disk || [],
        topProcesses: slow?.topProcesses || [],
      }

      setMetrics(combined)
    }

    const fetchFast = async () => {
      if (fastInFlight.current) {
        scheduleFast()
        return
      }

      fastInFlight.current = true

      try {
        const res = await fetch('/api/socket')
        if (res.status === 429) return
        if (!res.ok) throw new Error('Failed to fetch fast metrics')
        const data = await res.json()
        if (cancelled) return
        fastDataRef.current = data
        combineAndSet()
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        fastInFlight.current = false
        if (!cancelled) scheduleFast()
        setLoading(false)
      }
    }

    const fetchSlow = async () => {
      if (slowInFlight.current) {
        scheduleSlow()
        return
      }

      slowInFlight.current = true

      try {
        const res = await fetch('/api/metrics/slow')
        if (res.status === 429) return
        if (!res.ok) throw new Error('Failed to fetch slow metrics')
        const data = await res.json()
        if (cancelled) return
        slowDataRef.current = data
        combineAndSet()
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        slowInFlight.current = false
        if (!cancelled) scheduleSlow()
      }
    }

    void fetchFast()
    void fetchSlow()

    return () => {
      cancelled = true
      if (fastTimeoutRef.current) clearTimeout(fastTimeoutRef.current)
      if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current)
    }
  }, [fastInterval, slowInterval])

  return { metrics, loading, error }
}
