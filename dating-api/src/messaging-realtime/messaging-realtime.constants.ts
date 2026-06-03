export const MESSAGING_WS_NAMESPACE = '/ws/messaging';

/** Server → client event after REST message persist (Story 2). */
export const MESSAGING_EVENT_MESSAGE_NEW = 'message.new';

/** Client → server — participant subscribe (Story 6). */
export const MESSAGING_EVENT_CONVERSATION_SUBSCRIBE = 'conversation.subscribe';

/** Client → server — leave conversation focus (Story 6). */
export const MESSAGING_EVENT_CONVERSATION_UNSUBSCRIBE =
  'conversation.unsubscribe';

/** Server → client — subscribe authorized. */
export const MESSAGING_EVENT_SUBSCRIBE_OK = 'subscribe.ok';

/** Server → client — subscribe rejected. */
export const MESSAGING_EVENT_SUBSCRIBE_DENIED = 'subscribe.denied';

export const USER_ROOM_PREFIX = 'user:';

export function userRoom(userId: string): string {
  return `${USER_ROOM_PREFIX}${userId}`;
}
