'use client'

import { useState } from 'react'
import { StatCard } from '@/components/StatCard'
import { PerformanceChart } from '@/components/PerformanceChart'
import { ProcessList } from '@/components/ProcessList'
import { DiskUsage } from '@/components/DiskUsage'
import { useSystemMetrics } from '@/lib/hooks/useSystemMetrics'

export default function Home() {
  const { metrics, loading, error } = useSystemMetrics()
  const [tab, setTab] = useState<'overview' | 'details'>('overview')

  const handleKillProcess = async (pid: number) => {
    if (confirm(`Are you sure you want to kill process ${pid}?`)) {
      try {
        const response = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'kill', pid }),
        })
        if (response.ok) {
          alert('Process killed successfully')
        }
      } catch (err) {
        alert('Failed to kill process')
      }
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
            <p className="font-semibold mb-2">Error Loading System Data</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2 text-red-400/70">
              Make sure this application is running on Windows with proper permissions.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Task Manager Pro</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Advanced system monitoring and task management
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                Updating...
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab('overview')}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                tab === 'overview'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setTab('details')}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                tab === 'details'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Details
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {tab === 'overview' && metrics && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="CPU Usage"
                value={metrics.cpu.usage}
                unit="%"
                percentage={metrics.cpu.usage}
              />
              <StatCard
                title="Memory Usage"
                value={metrics.memory.usagePercent}
                unit="%"
                percentage={metrics.memory.usagePercent}
              />
              <StatCard
                title="Memory (GB)"
                value={(metrics.memory.used / (1024 ** 3)).toFixed(1)}
                unit={`/ ${(metrics.memory.total / (1024 ** 3)).toFixed(1)} GB`}
              />
              <StatCard
                title="CPU Cores"
                value={metrics.cpu.cores.length}
                unit={`cores`}
              />
            </div>

            {/* Performance Chart */}
            <PerformanceChart
              cpuUsage={metrics.cpu.usage}
              memoryUsage={metrics.memory.usagePercent}
            />

            {/* Disk and Process Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <DiskUsage disks={metrics.disk} />
              </div>
              <div className="lg:col-span-2">
                <ProcessList
                  processes={metrics.topProcesses}
                  onKillProcess={handleKillProcess}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'details' && metrics && (
          <div className="space-y-6">
            {/* Full Disk Info */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Disk Information</h2>
              <DiskUsage disks={metrics.disk} />
            </div>

            {/* Network Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Network Interfaces</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.network.map((net, idx) => (
                  <div
                    key={idx}
                    className="bg-muted/20 border border-border/50 rounded p-4"
                  >
                    <h3 className="font-semibold text-foreground mb-2">
                      {net.interface}
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        RX:{' '}
                        <span className="text-foreground">
                          {(net.rx_bytes / 1024).toFixed(2)} KB
                        </span>
                      </p>
                      <p>
                        TX:{' '}
                        <span className="text-foreground">
                          {(net.tx_bytes / 1024).toFixed(2)} KB
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Processes */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">All Processes</h2>
              <ProcessList
                processes={metrics.topProcesses}
                onKillProcess={handleKillProcess}
              />
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading system metrics...</div>
          </div>
        )}
      </div>
    </main>
  )
}
