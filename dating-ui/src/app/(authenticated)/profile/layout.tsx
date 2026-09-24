import { Suspense, type ReactNode } from 'react';
import { ProfileHubShell } from '@/components/profile/profile-hub-shell';

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">…</p>
        </div>
      }
    >
      <ProfileHubShell>{children}</ProfileHubShell>
    </Suspense>
  );
}
