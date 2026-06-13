import { PublicLandingClient } from "@/components/landing/public-landing-client";
import type { Metadata } from "next";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find your match",
  description: "Dating app — sign in with Google",
};

export default function PublicLandingPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-6 py-16 text-center text-sm text-zinc-500">
          …
        </main>
      }
    >
      <PublicLandingClient />
    </Suspense>
  );
}
