'use client'

interface Disk {
  filesystem: string
  size: number
  used: number
  usagePercent: number
  mount: string
}

interface DiskUsageProps {
  disks: Disk[]
}

export function DiskUsage({ disks }: DiskUsageProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getColor = (percent: number) => {
    if (percent < 50) return 'bg-green-500'
    if (percent < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-foreground font-semibold">Disk Usage</h3>
      </div>

      <div className="divide-y divide-border">
        {disks.map((disk, idx) => (
          <div key={idx} className="p-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-foreground font-medium text-sm">{disk.mount}</p>
                <p className="text-muted-foreground text-xs">{disk.filesystem}</p>
              </div>
              <div className="text-right">
                <p className="text-foreground font-medium text-sm">
                  {formatBytes(disk.used)} / {formatBytes(disk.size)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {disk.usagePercent.toFixed(1)}% used
                </p>
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getColor(disk.usagePercent)}`}
                style={{ width: `${Math.min(disk.usagePercent, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {disks.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No disk information available
        </div>
      )}
    </div>
  )
}
