// Internal English-only — admin tools are not product-localized.
import Link from 'next/link';

export default function AdminIndexPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Admin
      </h1>
      <ul className="space-y-3 text-sm">
        <li>
          <Link
            href="/admin/photos"
            className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
          >
            Photo moderation queue
          </Link>
        </li>
        <li>
          <Link
            href="/admin/reports"
            className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
          >
            User reports queue
          </Link>
        </li>
        <li>
          <Link
            href="/admin/match-quality"
            className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
          >
            Match quality
          </Link>
        </li>
      </ul>
    </main>
  );
}
