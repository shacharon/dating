/**
 * socket.io client for `/ws/messaging` (Sprint 4).
 */
import { io, type Socket } from 'socket.io-client';
import { getApiBase } from '@/lib/api-base';

export const MESSAGING_WS_NAMESPACE = '/ws/messaging';

/** Server → client event after REST message persist (Story 2). */
export const MESSAGING_EVENT_MESSAGE_NEW = 'message.new';

/** Client → server — authorize conversation focus (Story 6). */
export const MESSAGING_EVENT_CONVERSATION_SUBSCRIBE = 'conversation.subscribe';

/** Client → server — leave conversation focus (Story 6). */
export const MESSAGING_EVENT_CONVERSATION_UNSUBSCRIBE =
  'conversation.unsubscribe';

export function createMessagingSocket(): Socket {
  const base = getApiBase();
  const url =
    base ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  return io(`${url}${MESSAGING_WS_NAMESPACE}`, {
    path: '/socket.io',
    withCredentials: true,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
  });
}
