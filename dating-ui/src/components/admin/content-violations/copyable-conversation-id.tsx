'use client';

import { useState } from 'react';

function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

export function CopyableConversationId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard failures in restricted contexts
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={copied ? 'Copied' : `Click to copy ${id}`}
      className="font-mono text-[10px] text-left text-emerald-700 hover:underline dark:text-emerald-400"
    >
      {copied ? 'Copied' : truncateId(id)}
    </button>
  );
}
