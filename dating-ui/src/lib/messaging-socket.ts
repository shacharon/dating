/**
 * socket.io client for `/ws/messaging` (Sprint 4).
 */
import { io, type Socket } from 'socket.io-client';

export const MESSAGING_WS_NAMESPACE = '/ws/messaging';

/** Server → client event after REST message persist (Story 2). */
export const MESSAGING_EVENT_MESSAGE_NEW = 'message.new';

/** Client → server — authorize conversation focus (Story 6). */
export const MESSAGING_EVENT_CONVERSATION_SUBSCRIBE = 'conversation.subscribe';

/** Client → server — leave conversation focus (Story 6). */
export const MESSAGING_EVENT_CONVERSATION_UNSUBSCRIBE =
  'conversation.unsubscribe';

const DEFAULT_API_PORT = '3001';

/** Brief delay before tearing down socket when last consumer leaves (HMR / Strict Mode). */
const RELEASE_DISCONNECT_MS = 300;

/**
 * Socket origin — not always the same as REST `getApiBase()`.
 * REST uses same-origin `/api` (Next rewrite) for cookies; socket bypasses that
 * rewrite because WebSocket upgrade through Next dev proxy is unreliable.
 * Uses the UI hostname so session cookies match (`localhost` ≠ `127.0.0.1`).
 */
export function getMessagingSocketOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (explicit) {
    return explicit;
  }
  if (typeof window !== 'undefined') {
    const port =
      process.env.NEXT_PUBLIC_API_PORT?.trim() || DEFAULT_API_PORT;
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  return (
    process.env.INTERNAL_API_URL?.trim().replace(/\/$/, '') ??
    'http://127.0.0.1:3001'
  );
}

function buildMessagingSocket(): Socket {
  const origin = getMessagingSocketOrigin();
  return io(`${origin}${MESSAGING_WS_NAMESPACE}`, {
    path: '/socket.io',
    withCredentials: true,
    // Polling first, then upgrade — avoids WS handshake aborted by Next Fast Refresh.
    transports: ['polling', 'websocket'],
    upgrade: true,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
  });
}

let sharedSocket: Socket | null = null;
let consumerCount = 0;
let pendingDisconnect: ReturnType<typeof setTimeout> | null = null;

function cancelPendingDisconnect(): void {
  if (pendingDisconnect != null) {
    clearTimeout(pendingDisconnect);
    pendingDisconnect = null;
  }
}

/** One shared socket for the whole app — avoids duplicate handshakes/polling. */
export function acquireMessagingSocket(): Socket {
  cancelPendingDisconnect();
  if (!sharedSocket) {
    sharedSocket = buildMessagingSocket();
  }
  consumerCount += 1;
  if (consumerCount === 1 && !sharedSocket.connected) {
    sharedSocket.connect();
  }
  return sharedSocket;
}

export function releaseMessagingSocket(): void {
  if (consumerCount <= 0) {
    return;
  }
  consumerCount -= 1;
  if (consumerCount > 0) {
    return;
  }
  cancelPendingDisconnect();
  pendingDisconnect = setTimeout(() => {
    pendingDisconnect = null;
    if (consumerCount === 0 && sharedSocket) {
      sharedSocket.disconnect();
    }
  }, RELEASE_DISCONNECT_MS);
}

/** @internal Vitest-only — reset module singleton between tests. */
export function resetMessagingSocketForTests(): void {
  cancelPendingDisconnect();
  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  consumerCount = 0;
}
