import { AuthenticatedAppShell } from "@/components/authenticated-app-shell";
import type { ReactNode } from "react";

/** Authenticated URL group only — chrome lives in {@link AuthenticatedAppShell}. */

export default function AuthenticatedGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
