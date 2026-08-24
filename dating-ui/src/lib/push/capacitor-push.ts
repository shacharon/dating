import { isCapacitor } from "@/lib/platform/platform";
import type { PushNotificationData } from "@/lib/push/push-notification-routing";

type PluginListenerHandle = {
  remove: () => Promise<void>;
};

type PushNotificationsPlugin = {
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
  addListener: (
    eventName: string,
    listenerFunc: (event: unknown) => void,
  ) => Promise<PluginListenerHandle>;
};

let lastRegisteredToken: string | null = null;
let listenerHandles: PluginListenerHandle[] = [];
let pushModuleFailed = false;

export function getLastRegisteredPushToken(): string | null {
  return lastRegisteredToken;
}

export function clearLastRegisteredPushToken(): void {
  lastRegisteredToken = null;
}

/** @internal */
export function setLastRegisteredPushTokenForTests(token: string | null): void {
  lastRegisteredToken = token;
}

export type CapacitorPushHandlers = {
  onRegistration?: (token: string) => void | Promise<void>;
  onRegistrationError?: (error: unknown) => void;
  onNotificationAction?: (data: PushNotificationData) => void;
};

async function loadPushNotificationsPlugin(): Promise<PushNotificationsPlugin | null> {
  if (pushModuleFailed) {
    return null;
  }
  try {
    const mod = await import("@capacitor/push-notifications");
    return mod.PushNotifications as PushNotificationsPlugin;
  } catch {
    pushModuleFailed = true;
    return null;
  }
}

function asPushData(value: unknown): PushNotificationData {
  if (!value || typeof value !== "object") {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    type: typeof record.type === "string" ? record.type : undefined,
    conversationId:
      typeof record.conversationId === "string"
        ? record.conversationId
        : undefined,
  };
}

export async function teardownCapacitorPush(): Promise<void> {
  const handles = listenerHandles;
  listenerHandles = [];
  await Promise.all(handles.map((handle) => handle.remove().catch(() => {})));
}

export async function setupCapacitorPush(
  handlers: CapacitorPushHandlers,
): Promise<void> {
  if (!isCapacitor()) {
    return;
  }

  await teardownCapacitorPush();

  const PushNotifications = await loadPushNotificationsPlugin();
  if (!PushNotifications) {
    return;
  }

  listenerHandles.push(
    await PushNotifications.addListener("registration", (event) => {
      const token = (event as { value?: string }).value?.trim();
      if (!token) {
        return;
      }
      lastRegisteredToken = token;
      void handlers.onRegistration?.(token);
    }),
  );

  listenerHandles.push(
    await PushNotifications.addListener("registrationError", (event) => {
      handlers.onRegistrationError?.(event);
    }),
  );

  listenerHandles.push(
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (event) => {
        const notification = (event as { notification?: { data?: unknown } })
          .notification;
        handlers.onNotificationAction?.(asPushData(notification?.data));
      },
    ),
  );

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === "granted") {
    await PushNotifications.register();
  }
}

/** Reset module state between tests. */
export function resetCapacitorPushForTests(): void {
  lastRegisteredToken = null;
  listenerHandles = [];
  pushModuleFailed = false;
}
