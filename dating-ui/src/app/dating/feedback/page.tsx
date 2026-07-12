import { Suspense } from 'react';
import { FeedbackForm } from './feedback-form';

function FeedbackFallback() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-lg py-12 text-sm text-zinc-600 dark:text-zinc-400">
        Loading…
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<FeedbackFallback />}>
      <FeedbackForm />
    </Suspense>
  );
}
