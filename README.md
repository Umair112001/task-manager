# Task Manager Pro

Advanced Windows system monitoring and task management application built with Next.js 16, React, and Recharts.

## Features

- **Real-time Monitoring**: Live CPU, Memory, Disk, and Network metrics with 1-second updates
- **Performance Charts**: Line charts showing CPU and Memory usage trends over time
- **Process Management**: View and terminate running processes with granular CPU and Memory usage details
- **Disk Analytics**: Monitor disk usage across all drives with progress bars
- **Network Monitoring**: Track network interface statistics including RX/TX bytes
- **Dual Tabs**: Overview for dashboard and Details for comprehensive system information
- **Dark Theme**: Modern dark interface optimized for extended monitoring sessions
- **Responsive Design**: Fully responsive layout that works on desktop and mobile devices
- **Fallback Mode**: Mock data support for demonstration without Windows-specific dependencies

## Technology Stack

- **Frontend**: Next.js 16, React 19.2, TypeScript
- **UI Components**: Tailwind CSS v4, Recharts for charts
- **System Monitoring**: systeminformation library (Windows)
- **Real-time Updates**: HTTP polling with 1-second refresh intervals
- **Styling**: Dark theme with cyan/blue accents, semantic design tokens

## Installation

### Prerequisites
- Node.js 18+ (20+ recommended)
- pnpm (or npm/yarn)
- Windows 10/11 (for real system data) or any OS (mock data)

### Setup

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd task-manager-pro
   pnpm install
   ```

2. **Run Development Server**
   ```bash
   pnpm dev
   ```

3. **Open in Browser**
   Navigate to `http://localhost:3000`

## Usage

### Overview Tab
- **CPU Usage**: Real-time CPU utilization percentage with progress bar
- **Memory Usage**: RAM consumption as percentage and absolute GB values
- **Performance Metrics**: Line chart tracking CPU and Memory over the last 60 data points
- **Disk Usage**: Visual representation of disk space usage per drive
- **Running Processes**: Top processes by memory usage with sorting options

### Details Tab
- **Complete Disk Information**: All mounted drives with detailed usage information
- **Network Interfaces**: All network adapters with RX/TX byte counters
- **All Processes**: Extended process list (up to 100 entries) with search and sort functionality

### Process Management
- Click "Kill" button to terminate any running process (requires confirmation)
- Filter processes by name using the search box
- Sort by CPU or Memory usage

## API Routes

### `/api/socket` (GET)
Returns current system metrics. Rate limited to 1 request per 100ms to prevent excessive API calls.

**Response Format:**
```json
{
  "timestamp": 1718030000000,
  "cpu": {
    "usage": 25.5,
    "cores": [{"load": 25.5}, ...]
  },
  "memory": {
    "used": 8589934592,
    "total": 17179869184,
    "usagePercent": 50.0
  },
  "disk": [
    {
      "filesystem": "C:\\",
      "size": 536870912000,
      "used": 268435456000,
      "usagePercent": 50.0,
      "mount": "C:\\"
    }
  ],
  "network": [
    {
      "interface": "Ethernet",
      "rx_bytes": 1000000000,
      "tx_bytes": 500000000
    }
  ],
  "topProcesses": [
    {
      "pid": 1234,
      "name": "chrome.exe",
      "cpu": 5.2,
      "mem": 12.5
    }
  ]
}
```

### `/api/process` (GET/POST)
- **GET**: Returns list of all running processes
- **POST**: Execute process actions
  ```json
  {
    "action": "kill",
    "pid": 1234
  }
  ```

## Fallback & Error Handling

If real system metrics cannot be retrieved:
- The application automatically switches to mock data mode
- Mock data simulates realistic system metrics with slight randomization
- Users can still interact with all UI features
- An error message is displayed if data cannot be fetched

## Performance Metrics

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FCP (First Contentful Paint)**: < 1.5s
- **INP (Interaction to Next Paint)**: < 200ms
- **CLS (Cumulative Layout Shift)**: < 0.1

## Deployment

### Deploy to Vercel

```bash
vercel deploy
```

Vercel deployment includes automatic environment setup and optimization for the best performance.

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

Build and run:
```bash
docker build -t task-manager-pro .
docker run -p 3000:3000 task-manager-pro
```

## Customization

### Adjust Update Interval
Edit `/app/lib/hooks/useSystemMetrics.ts`:
```typescript
const { metrics, loading, error } = useSystemMetrics(2000) // 2 seconds
```

### Modify Chart History
Edit `/app/components/PerformanceChart.tsx`:
```typescript
return newData.slice(-120) // 2 minutes of history at 1Hz
```

### Change Color Scheme
Edit `/app/globals.css` to modify dark theme colors:
```css
--primary: oklch(0.56 0.18 255);  /* Change primary accent color */
--accent: oklch(0.6 0.2 260);     /* Change accent color */
```

## Troubleshooting

### "Error Loading System Data"
- **Windows**: Ensure you're running on Windows 10/11 with proper permissions
- **Other OS**: Mock data should load automatically
- **Fix**: The app defaults to mock data if systeminformation fails

### High CPU Usage
- Reduce update frequency by increasing interval in `useSystemMetrics`
- Close other CPU-intensive applications
- Use the production build: `pnpm build && pnpm start`

### Memory Leak Issues
- Each performance data point is kept in state; reduce history size in `PerformanceChart`
- Ensure processes are properly filtered in the ProcessList component

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Future Enhancements

- [ ] GPU monitoring and metrics
- [ ] Process priority adjustment
- [ ] System event logging
- [ ] Performance history export (CSV/JSON)
- [ ] Custom alerts for CPU/Memory thresholds
- [ ] Dark/Light theme toggle
- [ ] Multi-user monitoring (network monitoring)
- [ ] Startup program management
- [ ] System services management
- [ ] Resource-based app recommendations
