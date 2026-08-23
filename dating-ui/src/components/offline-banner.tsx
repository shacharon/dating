"use client";

import { useAppLocale } from "@/lib/i18n";
import { useOnlineStatus } from "@/lib/use-online-status";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const { copy } = useAppLocale();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200"
    >
      {copy.appShell.offlineBanner}
    </div>
  );
}
