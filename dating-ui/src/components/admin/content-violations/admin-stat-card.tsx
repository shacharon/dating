export function AdminStatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{label}</div>
    </div>
  );
}
