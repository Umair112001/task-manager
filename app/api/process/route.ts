import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as si from 'systeminformation'
import { logEvent } from '@/lib/telemetry'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const { action, pid, priority } = await request.json()
    const normalizedPid = Number(pid)

    if (!action || !Number.isInteger(normalizedPid) || normalizedPid <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid action/pid' },
        { status: 400 }
      )
    }

    if (action === 'kill') {
      try {
        if (process.platform === 'win32') {
          // Use taskkill on Windows for robust termination of arbitrary processes.
          await execAsync(`taskkill /PID ${normalizedPid} /F`)
        } else {
          process.kill(normalizedPid)
        }

        logEvent({ ts: Date.now(), source: 'process', path: '/api/process', durationMs: Date.now() - t0, status: 200, meta: { action: 'kill', pid: normalizedPid } })
        return NextResponse.json({ success: true, message: 'Process killed' })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown process kill error'
        logEvent({ ts: Date.now(), source: 'process', path: '/api/process', durationMs: Date.now() - t0, status: 500, error: message, meta: { action: 'kill', pid: normalizedPid } })
        return NextResponse.json(
          { error: `Failed to kill process: ${message}` },
          { status: 500 }
        )
      }
    }

    if (action === 'priority') {
      try {
        if (priority === undefined || priority === null) {
          return NextResponse.json(
            { error: 'Missing priority value' },
            { status: 400 }
          )
        }

        // Set process priority (Windows specific)
        // This is a simplified version - requires admin privileges
        await execAsync(
          `wmic process where processid=${normalizedPid} call setpriority ${priority}`
        )

        logEvent({ ts: Date.now(), source: 'process', path: '/api/process', durationMs: Date.now() - t0, status: 200, meta: { action: 'priority', pid: normalizedPid, priority } })
        return NextResponse.json({ success: true, message: 'Priority updated' })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown priority update error'
        logEvent({ ts: Date.now(), source: 'process', path: '/api/process', durationMs: Date.now() - t0, status: 500, error: message, meta: { action: 'priority', pid: normalizedPid } })
        return NextResponse.json(
          { error: `Failed to set priority: ${message}` },
          { status: 500 }
        )
      }
    }

    logEvent({ ts: Date.now(), source: 'process', path: '/api/process', durationMs: Date.now() - t0, status: 400, meta: { action: action } })
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing request:', error)
    logEvent({ ts: Date.now(), source: 'process', path: '/api/process', durationMs: Date.now() - t0, status: 500, error: (error as Error).message })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  try {
    const processes = await si.processes()
    const topProcesses = processes.list
      .sort((a, b) => (b.mem || 0) - (a.mem || 0))
      .slice(0, 100)
      .map((proc) => ({
        pid: proc.pid,
        name: proc.name,
        command: proc.command,
        cpu: proc.cpu || 0,
        mem: proc.mem || 0,
      }))

    logEvent({ ts: Date.now(), source: 'process', path: '/api/process', durationMs: Date.now() - t0, status: 200, meta: { count: topProcesses.length } })
    return NextResponse.json(topProcesses)
  } catch (error) {
    console.error('Error fetching processes:', error)
    logEvent({ ts: Date.now(), source: 'process', path: '/api/process', durationMs: Date.now() - t0, status: 500, error: (error as Error).message })
    return NextResponse.json(
      { error: 'Failed to fetch processes' },
      { status: 500 }
    )
  }
}
