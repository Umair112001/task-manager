import { NextRequest, NextResponse } from 'next/server'
import * as si from 'systeminformation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const [
      cpuData,
      memData,
      diskData,
      networkData,
      gpuData,
      processData,
    ] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.graphics(),
      si.processes(),
    ])

    return NextResponse.json({
      cpu: {
        usage: cpuData.currentLoad,
        cores: cpuData.cores.map((core) => ({
          load: core.load,
        })),
      },
      memory: {
        used: memData.used,
        total: memData.total,
        usagePercent: (memData.used / memData.total) * 100,
      },
      disk: diskData.map((disk) => ({
        filesystem: disk.fs,
        size: disk.size,
        used: disk.used,
        usagePercent: (disk.used / disk.size) * 100,
        mount: disk.mount,
      })),
      network: networkData.map((net) => ({
        interface: net.iface,
        rx_bytes: net.rx_bytes,
        tx_bytes: net.tx_bytes,
        rx_dropped: net.rx_dropped,
        tx_dropped: net.tx_dropped,
      })),
      gpu: gpuData,
      topProcesses: processData.list
        .sort((a, b) => (b.mem || 0) - (a.mem || 0))
        .slice(0, 20)
        .map((proc) => ({
          pid: proc.pid,
          name: proc.name,
          command: proc.command,
          cpu: proc.cpu || 0,
          mem: proc.mem || 0,
        })),
    })
  } catch (error) {
    console.error('Error fetching system data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system data' },
      { status: 500 }
    )
  }
}
