import type { ReactNode } from "react";

/**
 * Public routes only: no `AuthenticatedAppShell`, no top nav.
 * Auth state may still load in `AuthProvider` (root) for the landing Google CTA.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return children;
}
