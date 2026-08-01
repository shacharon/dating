import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchConversationMessages,
  markConversationAsRead,
  sendConversationMessage,
  type MessageDto,
} from '@/lib/conversations-api';
import {
  useMessagingSocket,
  type MessagingConnectionStatus,
} from '@/hooks/use-messaging-socket';
import { getRealtimeMode } from '@/lib/realtime-mode';
import { SEND_COOLDOWN_MS } from '@/lib/conversation-message-limits';
import {
  ContentModerationApiError,
  MessagingMutedError,
  type ContentModerationDetails,
} from '@/lib/content-moderation-error';

const POLL_INTERVAL_MS = 3000;
const MARK_READ_DEBOUNCE_MS = 15_000;

function appendUniqueMessages(
  prev: MessageDto[],
  incoming: MessageDto[],
): MessageDto[] {
  const ids = new Set(prev.map((m) => m.id));
  const append = incoming.filter((m) => !ids.has(m.id));
  if (append.length === 0) return prev;
  return [...prev, ...append];
}

export interface UseConversationMessagesOptions {
  conversationId: string;
  enabled?: boolean;
  onRefreshUnread?: () => void;
}

export interface UseConversationMessagesReturn {
  messages: MessageDto[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  sending: boolean;
  sendError: string | null;
  sendModerationDetails: ContentModerationDetails | null;
  clearSendError: () => void;
  markAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
  loadEarlier: () => Promise<void>;
  loadingEarlier: boolean;
  socketReconnecting: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  initialScrollDone: boolean;
}

export function useConversationMessages(
  options: UseConversationMessagesOptions,
): UseConversationMessagesReturn {
  const { conversationId, enabled = true, onRefreshUnread } = options;
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendModerationDetails, setSendModerationDetails] =
    useState<ContentModerationDetails | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [socketReconnecting, setSocketReconnecting] = useState(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  const messagesRef = useRef<MessageDto[]>([]);
  const lastMarkReadAtRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const realtimeMode = getRealtimeMode();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    lastMarkReadAtRef.current = 0;
    setSocketReconnecting(false);
  }, [conversationId]);

  const tryMarkRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await markConversationAsRead(conversationId);
      lastMarkReadAtRef.current = Date.now();
      if (onRefreshUnread) {
        void onRefreshUnread();
      }
    } catch {
      // silent — read tracking must not block messaging
    }
  }, [conversationId, onRefreshUnread]);

  const mergeIncomingMessages = useCallback((incoming: MessageDto[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const merged = appendUniqueMessages(prev, incoming);
      return merged;
    });
  }, []);

  const handleMessageNew = useCallback(
    (msg: MessageDto) => mergeIncomingMessages([msg]),
    [mergeIncomingMessages],
  );

  const getLastMessageId = useCallback(
    () => messagesRef.current[messagesRef.current.length - 1]?.id,
    [],
  );

  const handleSocketConnectionChange = useCallback(
    (status: MessagingConnectionStatus) => {
      setSocketReconnecting(status === 'reconnecting');
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!conversationId || !enabled) return;
    setLoading(true);
    setError(null);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    setInitialScrollDone(false);

    try {
      const result = await fetchConversationMessages(conversationId);
      setMessages(result.messages);
      setHasMore(result.pagination.hasMore);
      setNextCursor(result.pagination.nextCursor);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Failed to load messages',
      );
    } finally {
      setLoading(false);
    }
  }, [conversationId, enabled]);

  useEffect(() => {
    if (!conversationId || !enabled) return;
    void refresh();
  }, [conversationId, enabled]);

  useEffect(() => {
    if (!conversationId || loading || !enabled) return;
    void tryMarkRead();
  }, [conversationId, loading, enabled, tryMarkRead]);

  useEffect(() => {
    if (!conversationId || !enabled) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastMarkReadAtRef.current < MARK_READ_DEBOUNCE_MS) return;
      void tryMarkRead();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [conversationId, enabled, tryMarkRead]);

  useMessagingSocket({
    enabled: realtimeMode === 'ws' && !!conversationId && !loading && enabled,
    conversationId,
    onMessageNew: handleMessageNew,
    getLastMessageId,
    onMessagesMerged: mergeIncomingMessages,
    onConnectionChange: handleSocketConnectionChange,
  });

  useEffect(() => {
    if (realtimeMode !== 'poll') return;
    if (!conversationId || loading || !enabled) return;

    const poll = async () => {
      if (document.visibilityState !== 'visible') return;

      const list = messagesRef.current;
      const lastId = list[list.length - 1]?.id;
      if (!lastId) return;

      try {
        const { messages: incoming } = await fetchConversationMessages(conversationId, {
          after: lastId,
          limit: 100,
        });
        mergeIncomingMessages(incoming);
      } catch {
        // silent retry on next tick
      }
    };

    const intervalId = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [realtimeMode, conversationId, loading, enabled, mergeIncomingMessages]);

  const loadEarlier = useCallback(async () => {
    if (!conversationId || !hasMore || !nextCursor || loadingEarlier) return;
    setLoadingEarlier(true);
    setError(null);
    const listEl = listRef.current;
    const prevScrollHeight = listEl?.scrollHeight ?? 0;

    try {
      const result = await fetchConversationMessages(conversationId, {
        before: nextCursor,
      });
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const prepend = result.messages.filter((m) => !ids.has(m.id));
        return [...prepend, ...prev];
      });
      setHasMore(result.pagination.hasMore);
      setNextCursor(result.pagination.nextCursor);

      requestAnimationFrame(() => {
        if (!listEl) return;
        const newScrollHeight = listEl.scrollHeight;
        listEl.scrollTop += newScrollHeight - prevScrollHeight;
      });
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Failed to load earlier messages',
      );
    } finally {
      setLoadingEarlier(false);
    }
  }, [hasMore, conversationId, loadingEarlier, nextCursor]);

  const clearSendError = useCallback(() => {
    setSendError(null);
    setSendModerationDetails(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return;
      setSendError(null);
      setSendModerationDetails(null);
      setSending(true);
      try {
        const sent = await sendConversationMessage(conversationId, content);
        setMessages((prev) => appendUniqueMessages(prev, [sent]));
        await new Promise((r) => setTimeout(r, SEND_COOLDOWN_MS));
      } catch (e: unknown) {
        if (e instanceof ContentModerationApiError) {
          setSendModerationDetails(e.details);
          setSendError(null);
        } else if (e instanceof MessagingMutedError) {
          setSendError(e.message);
          setSendModerationDetails(null);
        } else {
          setSendError(
            e instanceof Error ? e.message : 'Failed to send message',
          );
          setSendModerationDetails(null);
        }
        throw e;
      } finally {
        setSending(false);
      }
    },
    [conversationId],
  );

  useEffect(() => {
    if (loading || initialScrollDone) return;
    if (messages.length === 0) return;
    setInitialScrollDone(true);
  }, [loading, messages.length, initialScrollDone]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    sending,
    sendError,
    sendModerationDetails,
    clearSendError,
    markAsRead: tryMarkRead,
    refresh,
    hasMore,
    loadEarlier,
    loadingEarlier,
    socketReconnecting,
    listRef,
    initialScrollDone,
  };
}
