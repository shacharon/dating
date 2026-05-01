import { AuthenticatedAppShell } from "@/components/authenticated-app-shell";
import type { ReactNode } from "react";

/** `/dating/*` uses the same shell as `(authenticated)` (single {@link AuthenticatedAppShell}). */

export default function DatingSegmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
