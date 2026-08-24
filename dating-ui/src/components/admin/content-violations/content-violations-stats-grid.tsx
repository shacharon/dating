import type { AdminContentViolationStats } from '@/lib/admin/admin-content-violations-api';
import { AdminStatCard } from '@/components/admin/content-violations/admin-stat-card';

export function ContentViolationsStatsGrid({
  stats,
}: {
  stats: AdminContentViolationStats | null;
}) {
  if (!stats) return null;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      <AdminStatCard label="Total violations" value={stats.totalViolations} />
      <AdminStatCard
        label="Blocked profile users"
        value={stats.blockedProfileUsers}
      />
      <AdminStatCard
        label="Muted (temporary)"
        value={stats.mutedMessageUsersTemporary}
      />
      <AdminStatCard
        label="Muted (indefinite)"
        value={stats.mutedMessageUsersIndefinite}
      />
    </div>
  );
}
