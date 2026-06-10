'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Process {
  pid: number
  name: string
  cpu: number
  mem: number
}

interface ProcessListProps {
  processes: Process[]
  onKillProcess?: (pid: number) => void
}

export function ProcessList({ processes, onKillProcess }: ProcessListProps) {
  const [sortBy, setSortBy] = useState<'cpu' | 'mem'>('mem')
  const [filter, setFilter] = useState('')

  const sortedProcesses = [...processes]
    .sort((a, b) => {
      if (sortBy === 'cpu') return b.cpu - a.cpu
      return b.mem - a.mem
    })
    .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, 20)

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-foreground font-semibold mb-3">Running Processes</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter processes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 bg-input border border-border rounded px-3 py-2 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'cpu' | 'mem')}
            className="bg-input border border-border rounded px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="mem">Sort by Memory</option>
            <option value="cpu">Sort by CPU</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-muted-foreground font-medium">
                Process Name
              </th>
              <th className="px-4 py-3 text-right text-muted-foreground font-medium">
                PID
              </th>
              <th className="px-4 py-3 text-right text-muted-foreground font-medium">
                CPU %
              </th>
              <th className="px-4 py-3 text-right text-muted-foreground font-medium">
                Memory %
              </th>
              <th className="px-4 py-3 text-center text-muted-foreground font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedProcesses.map((proc) => (
              <tr
                key={proc.pid}
                className="border-b border-border hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 text-foreground">{proc.name}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {proc.pid}
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  <span
                    className={
                      proc.cpu > 50 ? 'text-red-400' : 'text-yellow-400'
                    }
                  >
                    {proc.cpu.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  <span
                    className={
                      proc.mem > 15 ? 'text-red-400' : 'text-blue-400'
                    }
                  >
                    {proc.mem.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onKillProcess?.(proc.pid)}
                    className="text-xs"
                  >
                    Kill
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedProcesses.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No processes found matching your criteria
        </div>
      )}
    </div>
  )
}
