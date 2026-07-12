'use client';

import { useEffect } from 'react';
import {
  fetchConversationMessages,
  type MessageDto,
} from '@/lib/conversations-api';
import {
  acquireMessagingSocket,
  MESSAGING_EVENT_CONVERSATION_SUBSCRIBE,
  MESSAGING_EVENT_CONVERSATION_UNSUBSCRIBE,
  MESSAGING_EVENT_MESSAGE_NEW,
  releaseMessagingSocket,
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

    const socket = acquireMessagingSocket();
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

    const onDisconnect = (reason: string) => {
      if (!wasConnected) {
        return;
      }
      // Polling→WebSocket upgrade closes the polling transport; not a real outage.
      if (reason === 'transport close' && socket.active) {
        return;
      }
      if (reason === 'io client disconnect') {
        return;
      }
      onConnectionChange?.('reconnecting');
    };

    if (socket.connected) {
      onConnect();
    }

    socket.on(MESSAGING_EVENT_MESSAGE_NEW, onEvent);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      if (conversationId) {
        socket.emit(MESSAGING_EVENT_CONVERSATION_UNSUBSCRIBE, {
          conversationId,
        });
      }
      socket.off(MESSAGING_EVENT_MESSAGE_NEW, onEvent);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      releaseMessagingSocket();
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
