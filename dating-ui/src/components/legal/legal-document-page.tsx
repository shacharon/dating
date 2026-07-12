import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

const DRAFT_FOOTER = '[DRAFT — legal review pending]';

export function LegalDocumentPage({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <main
      dir="ltr"
      lang="en"
      className="mx-auto max-w-2xl px-6 py-12 text-zinc-900 dark:text-zinc-100"
    >
      <p className="mb-6">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          ← Back
        </Link>
      </p>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">{title}</h1>
      <article className="prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-emerald-700 dark:prose-a:text-emerald-400">
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
      <footer className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {DRAFT_FOOTER}
      </footer>
    </main>
  );
}

export { DRAFT_FOOTER };
