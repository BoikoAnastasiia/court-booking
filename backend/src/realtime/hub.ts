import { WebSocket } from 'ws';

/**
 * Events pushed to connected browsers. They only say *what* changed; clients
 * re-fetch through the normal API, so per-viewer data (e.g. "your booking")
 * and authorization stay in one place and no other user's data is broadcast.
 */
export type RealtimeEvent =
  | { type: 'availability.changed'; courtId: number; date: string }
  | { type: 'courts.changed' };

export interface Publisher {
  publish(event: RealtimeEvent): void;
}

export const noopPublisher: Publisher = { publish: () => undefined };

/**
 * In-memory set of authenticated sockets. Works for a single backend
 * instance; with several instances, publish() would go through Postgres
 * LISTEN/NOTIFY or Redis pub/sub so every instance can fan out.
 */
export class RealtimeHub implements Publisher {
  private readonly clients = new Set<WebSocket>();

  add(socket: WebSocket): void {
    this.clients.add(socket);
    socket.on('close', () => this.clients.delete(socket));
  }

  get size(): number {
    return this.clients.size;
  }

  publish(event: RealtimeEvent): void {
    const message = JSON.stringify(event);
    for (const socket of this.clients) {
      if (socket.readyState === WebSocket.OPEN) socket.send(message);
    }
  }
}
