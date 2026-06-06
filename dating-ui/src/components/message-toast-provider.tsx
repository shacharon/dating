'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';
import { useRouter } from 'next/navigation';
import { MessageToastView } from '@/components/message-toast';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  getCopy,
  readStoredLocale,
  type AppLocale,
} from '@/lib/i18n';
import { fetchMyConversations, type MessageDto } from '@/lib/conversations-api';
import { shouldShowMessageToast } from '@/lib/message-in-app-notify';
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

export function MessageToastProvider({
  sessionUserId,
  children,
}: {
  sessionUserId: string;
  children: ReactNode;
}): ReactElement {
  const router = useRouter();
  const realtimeMode = getRealtimeMode();
  const [toast, setToast] = useState<ToastState>(null);
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);
  const peerLabelsRef = useRef<PeerLabelIndex>(new Map());
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

  const refreshPeerLabels = useCallback(async () => {
    try {
      const dto = await fetchMyConversations();
      peerLabelsRef.current = buildPeerLabelIndex(dto.conversations ?? []);
    } catch {
      // best-effort — toast falls back to "Someone"
    }
  }, []);

  const handleToastMessageNew = useCallback(
    (msg: MessageDto) => {
      if (!shouldShowMessageToast(msg, sessionUserId)) {
        return;
      }
      const label = resolvePeerLabel(peerLabelsRef.current, msg.senderId);
      showToast(label, msg.conversationId);
    },
    [sessionUserId, showToast],
  );

  useMessagingSocket({
    enabled: realtimeMode === 'ws' && Boolean(sessionUserId),
    onMessageNew: handleToastMessageNew,
    getLastMessageId: () => undefined,
    onMessagesMerged: () => {},
  });

  useEffect(() => {
    if (realtimeMode !== 'ws') {
      return;
    }
    void refreshPeerLabels();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void refreshPeerLabels();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [realtimeMode, refreshPeerLabels]);

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
