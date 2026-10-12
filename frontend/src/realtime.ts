import { useEffect, useRef, useState } from 'react';
import { tokenStore } from './api';

/** Mirrors the backend's RealtimeEvent. */
export type RealtimeEvent =
  | { type: 'availability.changed'; courtId: number; date: string }
  | { type: 'courts.changed' }
  /** Local only: we reconnected and may have missed events, so re-fetch. */
  | { type: 'resync' };

export type RealtimeStatus = 'connecting' | 'live' | 'offline';

const MAX_RETRY_DELAY_MS = 15_000;
const CLOSE_UNAUTHORIZED = 4401;

/**
 * Keeps a WebSocket to /api/ws open while the component is mounted and calls
 * `onEvent` for each server event. Reconnects with exponential backoff; after
 * a reconnect it emits `resync` because events may have been missed meanwhile.
 */
export function useRealtime(onEvent: (event: RealtimeEvent) => void): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  // Latest handler without reconnecting every time the caller re-renders.
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let wasLive = false;
    let stopped = false;

    function connect() {
      const token = tokenStore.get();
      if (!token) return;
      setStatus('connecting');
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protocol}://${window.location.host}/api/ws`);
      // Authenticate with the first message rather than the URL (keeps the token out of logs).
      socket.onopen = () => socket?.send(JSON.stringify({ type: 'auth', token }));
      socket.onmessage = (message) => {
        const event = JSON.parse(String(message.data)) as RealtimeEvent | { type: 'ready' };
        if (event.type === 'ready') {
          attempt = 0;
          setStatus('live');
          if (wasLive) handler.current({ type: 'resync' });
          wasLive = true;
          return;
        }
        handler.current(event);
      };
      socket.onclose = (event) => {
        setStatus('offline');
        if (stopped || event.code === CLOSE_UNAUTHORIZED) return;
        const delay = Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);

  return status;
}
