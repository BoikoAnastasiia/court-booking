import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { verifyToken } from '../auth/auth.middleware';
import type { RealtimeHub } from './hub';

export const WS_PATH = '/api/ws';
const AUTH_TIMEOUT_MS = 5_000;
const HEARTBEAT_MS = 30_000;

// Application close codes (4000–4999 are free for apps to use).
const CLOSE_UNAUTHORIZED = 4401;
const CLOSE_AUTH_TIMEOUT = 4408;

/**
 * Accepts WebSocket upgrades on WS_PATH. Protocol:
 *   client -> {"type":"auth","token":"<jwt>"}   (must be the first message)
 *   server -> {"type":"ready"}                  then RealtimeEvents
 * The token is sent as a message rather than in the URL so it doesn't end
 * up in proxy/access logs. Unauthenticated sockets receive nothing.
 */
export function attachRealtime(server: Server, hub: RealtimeHub): { close: () => void } {
  const wss = new WebSocketServer({ noServer: true });
  const alive = new WeakMap<WebSocket, boolean>();

  server.on('upgrade', (req, socket, head) => {
    if (req.url?.split('?')[0] !== WS_PATH) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
  });

  wss.on('connection', (ws: WebSocket) => {
    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));

    const authTimer = setTimeout(() => ws.close(CLOSE_AUTH_TIMEOUT, 'Authentication timeout'), AUTH_TIMEOUT_MS);

    ws.once('message', (data) => {
      clearTimeout(authTimer);
      try {
        const message = JSON.parse(String(data)) as { type?: unknown; token?: unknown };
        if (message.type !== 'auth' || typeof message.token !== 'string') throw new Error('expected auth');
        verifyToken(message.token);
      } catch {
        ws.close(CLOSE_UNAUTHORIZED, 'Unauthorized');
        return;
      }
      hub.add(ws);
      ws.send(JSON.stringify({ type: 'ready' }));
    });
    ws.on('close', () => clearTimeout(authTimer));
  });

  // Drop connections that stopped answering pings (closed laptop, lost network).
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.get(ws)) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, HEARTBEAT_MS);

  return {
    close: () => {
      clearInterval(heartbeat);
      for (const ws of wss.clients) ws.terminate();
      wss.close();
    },
  };
}
