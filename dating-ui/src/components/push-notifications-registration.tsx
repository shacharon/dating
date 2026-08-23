"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  setupCapacitorPush,
  teardownCapacitorPush,
} from "@/lib/push/capacitor-push";
import { registerDeviceToken } from "@/lib/push/device-tokens-api";
import { resolvePushNotificationPath } from "@/lib/push/push-notification-routing";
import { isCapacitor } from "@/lib/platform";
import {
  emitProductLog,
  getObservabilityRoute,
} from "@/lib/observability/product-logger";
import { UiErrorCodes } from "@/lib/observability/ui-error-codes";

function pushTokenPrefix(token: string): string {
  return token.slice(0, 8);
}

/** Capacitor-only: permissions, FCM token registration, and notification tap routing. */
export function PushNotificationsRegistration() {
  const router = useRouter();

  useEffect(() => {
    if (!isCapacitor()) {
      return;
    }

    let active = true;

    void setupCapacitorPush({
      onRegistration: async (token) => {
        if (!active) {
          return;
        }
        try {
          await registerDeviceToken(token, "android");
          emitProductLog({
            level: "trace",
            route: getObservabilityRoute(),
            message: `push token registered prefix=${pushTokenPrefix(token)}`,
            errorCode: UiErrorCodes.UI_PUSH_REGISTER,
          });
        } catch (err) {
          emitProductLog({
            level: "error",
            route: getObservabilityRoute(),
            message: `push token register failed prefix=${pushTokenPrefix(token)}`,
            errorCode: UiErrorCodes.UI_PUSH_REGISTER,
            meta: {
              reason: err instanceof Error ? err.message : String(err),
            },
          });
        }
      },
      onRegistrationError: (error) => {
        emitProductLog({
          level: "error",
          route: getObservabilityRoute(),
          message: "push registration error",
          errorCode: UiErrorCodes.UI_PUSH_REGISTER,
          meta: {
            reason: error instanceof Error ? error.message : String(error),
          },
        });
      },
      onNotificationAction: (data) => {
        router.push(resolvePushNotificationPath(data));
      },
    });

    return () => {
      active = false;
      void teardownCapacitorPush();
    };
  }, [router]);

  return null;
}
