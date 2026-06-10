'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useState, useEffect } from 'react'

interface DataPoint {
  time: string
  cpu: number
  memory: number
}

interface PerformanceChartProps {
  cpuUsage: number
  memoryUsage: number
}

export function PerformanceChart({ cpuUsage, memoryUsage }: PerformanceChartProps) {
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    const now = new Date()
    const timeString = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    setData((prevData) => {
      const newData = [
        ...prevData,
        {
          time: timeString,
          cpu: cpuUsage,
          memory: memoryUsage,
        },
      ]
      // Keep only last 60 data points (1 minute of data)
      return newData.slice(-60)
    })
  }, [cpuUsage, memoryUsage])

  return (
    <div className="w-full h-80 min-w-0 bg-card border border-border rounded-lg p-4">
      <h3 className="text-foreground font-semibold mb-4">Performance Metrics</h3>
      <div className="h-[calc(100%-2rem)] min-h-[220px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(255 255 255 / 0.1)" />
            <XAxis
              dataKey="time"
              stroke="rgb(255 255 255 / 0.5)"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="rgb(255 255 255 / 0.5)" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgb(22 28 45)',
                border: '1px solid rgb(255 255 255 / 0.1)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'rgb(235 238 245)' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cpu"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={2}
              name="CPU %"
            />
            <Line
              type="monotone"
              dataKey="memory"
              stroke="#ec4899"
              dot={false}
              strokeWidth={2}
              name="Memory %"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
