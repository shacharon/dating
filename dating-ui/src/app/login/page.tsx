import { Suspense } from "react";
import { LoginClient } from "./login-client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-12 text-sm text-zinc-500">
          Loading…
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
