import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private clockOffset: number = 0; // serverTime - localTime
  private lastRtt: number = 0;
  private syncInterval: number | null = null;

  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    // Connect to server (proxied in Vite or direct in production)
    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : window.location.origin;

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.startClockSync();
    });

    this.socket.on('disconnect', () => {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
    });

    // Handle pong for clock offset calculation
    this.socket.on('sync_clock_pong', (data: { clientTimestamp: number; serverTimestamp: number }) => {
      const now = Date.now();
      const rtt = now - data.clientTimestamp;
      this.lastRtt = rtt;
      // server time when pong was sent was approximately serverTimestamp.
      // Assuming symmetric latency: server time now is serverTimestamp + rtt / 2.
      const estimatedServerNow = data.serverTimestamp + (rtt / 2);
      this.clockOffset = estimatedServerNow - now;
    });

    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public getEstimatedServerTime(): number {
    return Date.now() + this.clockOffset;
  }

  public getLastRtt(): number {
    return this.lastRtt;
  }

  public getClockOffset(): number {
    return this.clockOffset;
  }

  private startClockSync(): void {
    if (!this.socket) return;
    // Initial clock sync ping
    this.socket.emit('sync_clock_ping', Date.now());

    // Recurring sync every 10 seconds to account for clock drift
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = window.setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('sync_clock_ping', Date.now());
      }
    }, 10000);
  }

  public disconnect(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
