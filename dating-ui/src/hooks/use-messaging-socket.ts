'use client';

import { useEffect } from 'react';
import {
  fetchConversationMessages,
  type MessageDto,
} from '@/lib/conversations-api';
import {
  createMessagingSocket,
  MESSAGING_EVENT_CONVERSATION_SUBSCRIBE,
  MESSAGING_EVENT_CONVERSATION_UNSUBSCRIBE,
  MESSAGING_EVENT_MESSAGE_NEW,
} from '@/lib/messaging-socket';

export type MessagingConnectionStatus = 'connected' | 'reconnecting';

export type UseMessagingSocketOptions = {
  enabled: boolean;
  /** When set, only `message.new` for this conversation are delivered. */
  conversationId?: string;
  onMessageNew: (message: MessageDto) => void;
  getLastMessageId: () => string | undefined;
  onMessagesMerged: (messages: MessageDto[]) => void;
  onConnectionChange?: (status: MessagingConnectionStatus) => void;
};

export function useMessagingSocket(options: UseMessagingSocketOptions): void {
  const {
    enabled,
    conversationId,
    onMessageNew,
    getLastMessageId,
    onMessagesMerged,
    onConnectionChange,
  } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = createMessagingSocket();
    let wasConnected = false;
    let catchUpInFlight = false;

    const runCatchUp = async (): Promise<void> => {
      if (!conversationId) {
        return;
      }
      const lastId = getLastMessageId();
      if (!lastId || catchUpInFlight) {
        return;
      }
      catchUpInFlight = true;
      try {
        const { messages } = await fetchConversationMessages(conversationId, {
          after: lastId,
          limit: 100,
        });
        if (messages.length > 0) {
          onMessagesMerged(messages);
        }
      } catch {
        // silent — next connect retries
      } finally {
        catchUpInFlight = false;
      }
    };

    const onEvent = (payload: MessageDto) => {
      if (
        conversationId !== undefined &&
        conversationId !== '' &&
        payload.conversationId !== conversationId
      ) {
        return;
      }
      onMessageNew(payload);
    };

    const onConnect = () => {
      wasConnected = true;
      onConnectionChange?.('connected');
      if (conversationId) {
        socket.emit(MESSAGING_EVENT_CONVERSATION_SUBSCRIBE, {
          conversationId,
        });
      }
      void runCatchUp();
    };

    const onDisconnect = () => {
      if (wasConnected) {
        onConnectionChange?.('reconnecting');
      }
    };

    socket.on(MESSAGING_EVENT_MESSAGE_NEW, onEvent);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.connect();

    return () => {
      if (conversationId) {
        socket.emit(MESSAGING_EVENT_CONVERSATION_UNSUBSCRIBE, {
          conversationId,
        });
      }
      socket.off(MESSAGING_EVENT_MESSAGE_NEW, onEvent);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [
    enabled,
    conversationId,
    onMessageNew,
    getLastMessageId,
    onMessagesMerged,
    onConnectionChange,
  ]);
}
