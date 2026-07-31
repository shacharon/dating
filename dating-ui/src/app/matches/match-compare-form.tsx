'use client';

import type { ProfileListItem } from '@/lib/profiles-api';

type MatchCompareFormProps = {
  items: ProfileListItem[];
  aId: string;
  bId: string;
  canCompare: boolean;
  compareLoading: boolean;
  onAIdChange: (id: string) => void;
  onBIdChange: (id: string) => void;
  onCompare: () => void;
};

export function MatchCompareForm({
  items,
  aId,
  bId,
  canCompare,
  compareLoading,
  onAIdChange,
  onBIdChange,
  onCompare,
}: MatchCompareFormProps) {
  return (
    <div className="space-y-4 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div>
        <label
          htmlFor="profile-a"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Profile A
        </label>
        <select
          id="profile-a"
          value={aId}
          onChange={(e) => onAIdChange(e.target.value)}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">Select…</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} (#{item.id})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="profile-b"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Profile B
        </label>
        <select
          id="profile-b"
          value={bId}
          onChange={(e) => onBIdChange(e.target.value)}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">Select…</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} (#{item.id})
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={onCompare}
        disabled={!canCompare || compareLoading}
        className="w-full rounded bg-zinc-900 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {compareLoading ? 'Comparing…' : 'Compare'}
      </button>
    </div>
  );
}
