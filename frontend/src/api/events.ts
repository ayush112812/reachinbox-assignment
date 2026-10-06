import { apiClient } from './client';

export type SSEEventCallback = (data: any) => void;

export class RealtimeEventClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<SSEEventCallback>> = new Map();
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  public connect(): void {
    if (this.eventSource) return;

    const url = `${apiClient.getBaseUrl()}/api/events`;
    try {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.notify('connection', { connected: true });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type) {
            this.notify(payload.type, payload);
          }
        } catch {
          // Ignore heartbeats and non-JSON comments
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.notify('connection', { connected: false });
        this.disconnect();

        // Attempt reconnection after 5 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 5000);
        }
      };
    } catch (err) {
      console.error('[SSE] Failed to establish EventSource connection:', err);
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
  }

  public on(event: string, callback: SSEEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private notify(event: string, data: any): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[SSE] Listener error for event '${event}':`, err);
      }
    });
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const realtimeEventClient = new RealtimeEventClient();
