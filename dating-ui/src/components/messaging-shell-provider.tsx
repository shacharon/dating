'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { MessageToastView } from '@/components/message-toast';
import {
  ConversationUnreadProvider,
  useConversationUnread,
} from '@/contexts/conversation-unread-context';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  getCopy,
  readStoredLocale,
  type AppLocale,
} from '@/lib/i18n';
import { type MessageDto } from '@/lib/conversations-api';
import {
  shouldBumpUnreadForMessage,
  shouldShowMessageToast,
} from '@/lib/message-in-app-notify';
import { MESSAGE_TOAST_AUTO_DISMISS_MS } from '@/lib/message-toast.constants';
import {
  buildPeerLabelIndex,
  resolvePeerLabel,
  type PeerLabelIndex,
} from '@/lib/message-toast-labels';
import { getRealtimeMode } from '@/lib/realtime-mode';

type ToastState = {
  senderLabel: string;
  conversationId: string;
} | null;

function MessagingShellInner({
  sessionUserId,
  peerLabelsRef,
  children,
}: {
  sessionUserId: string;
  peerLabelsRef: RefObject<PeerLabelIndex>;
  children: ReactNode;
}): ReactElement {
  const router = useRouter();
  const realtimeMode = getRealtimeMode();
  const { refresh, bumpFromMessage } = useConversationUnread();
  const [toast, setToast] = useState<ToastState>(null);
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current != null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    clearDismissTimer();
    setToast(null);
  }, [clearDismissTimer]);

  const showToast = useCallback(
    (senderLabel: string, conversationId: string) => {
      clearDismissTimer();
      setToast({ senderLabel, conversationId });
      dismissTimerRef.current = setTimeout(() => {
        setToast(null);
        dismissTimerRef.current = null;
      }, MESSAGE_TOAST_AUTO_DISMISS_MS);
    },
    [clearDismissTimer],
  );

  const handleMessageNew = useCallback(
    (msg: MessageDto) => {
      if (shouldShowMessageToast(msg, sessionUserId)) {
        const label = resolvePeerLabel(peerLabelsRef.current, msg.senderId);
        showToast(label, msg.conversationId);
      }
      if (shouldBumpUnreadForMessage(msg, sessionUserId)) {
        bumpFromMessage(msg.conversationId);
      }
    },
    [sessionUserId, showToast, bumpFromMessage, peerLabelsRef],
  );

  useMessagingSocket({
    enabled: realtimeMode === 'ws' && Boolean(sessionUserId),
    onMessageNew: handleMessageNew,
    getLastMessageId: () => undefined,
    onMessagesMerged: () => {},
  });

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void refresh({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  useEffect(() => {
    setLocale(readStoredLocale());
    const onLocaleChanged = (event: Event) => {
      const e = event as CustomEvent<AppLocale>;
      if (e.detail) {
        setLocale(e.detail);
        return;
      }
      setLocale(readStoredLocale());
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === APP_LOCALE_STORAGE_KEY) {
        setLocale(readStoredLocale());
      }
    };
    window.addEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => () => clearDismissTimer(), [clearDismissTimer]);

  const copy = getCopy(locale);

  return (
    <>
      {children}
      {toast ? (
        <MessageToastView
          message={copy.notifications.messageToast(toast.senderLabel)}
          actionLabel={copy.notifications.messageToastAction}
          dismissLabel={copy.notifications.messageToastDismiss}
          conversationId={toast.conversationId}
          onDismiss={dismissToast}
          onOpen={() => {
            router.push(`/dating/conversations/${toast.conversationId}`);
            dismissToast();
          }}
        />
      ) : null}
    </>
  );
}

export function MessagingShellProvider({
  sessionUserId,
  children,
}: {
  sessionUserId: string;
  children: ReactNode;
}): ReactElement {
  const peerLabelsRef = useRef<PeerLabelIndex>(new Map());

  const onConversationsFetched = useCallback(
    (conversations: Parameters<typeof buildPeerLabelIndex>[0]) => {
      peerLabelsRef.current = buildPeerLabelIndex(conversations);
    },
    [],
  );

  return (
    <ConversationUnreadProvider onConversationsFetched={onConversationsFetched}>
      <MessagingShellInner
        sessionUserId={sessionUserId}
        peerLabelsRef={peerLabelsRef}
      >
        {children}
      </MessagingShellInner>
    </ConversationUnreadProvider>
  );
}
