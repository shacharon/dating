import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isAuthTestPageEnabled } from "@/lib/auth/auth-test-gate";
import { DevAuthTestClient } from "./dev-auth-test-client";

export default function DevAuthTestPage() {
  if (!isAuthTestPageEnabled()) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 font-mono text-sm text-zinc-800 dark:text-zinc-200">
      <h1 className="mb-2 text-lg font-bold">Auth test (dev / flag)</h1>
      <p className="mb-6 text-xs text-zinc-500">
        Shown when <code>NODE_ENV=development</code> or{" "}
        <code>NEXT_PUBLIC_AUTH_TEST=1</code>. Not product UI.
      </p>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <DevAuthTestClient />
      </Suspense>
    </main>
  );
}
