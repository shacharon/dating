'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getAdminContentViolationStats,
  listAdminBlockedUsers,
  listAdminContentViolations,
  unblockAdminContentUser,
  type AdminBlockedUserItem,
  type AdminContentViolationListItem,
  type AdminContentViolationStats,
} from '@/lib/admin-content-violations-api';

/** Admin content-violations page model (useState fetch — RQ is Story 04). */
export function useAdminContentViolationsPage() {
  const [blockedUsers, setBlockedUsers] = useState<AdminBlockedUserItem[]>([]);
  const [blockedTotal, setBlockedTotal] = useState(0);
  const [rows, setRows] = useState<AdminContentViolationListItem[]>([]);
  const [stats, setStats] = useState<AdminContentViolationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [surface, setSurface] = useState('');
  const [category, setCategory] = useState('');
  const [action, setAction] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [hasRecipient, setHasRecipient] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [blocked, list, nextStats] = await Promise.all([
        listAdminBlockedUsers({ limit: 50, offset: 0 }),
        listAdminContentViolations({
          surface: surface || undefined,
          category: category || undefined,
          action: action || undefined,
          userStatus: userStatus || undefined,
          hasRecipient: hasRecipient === '1' || undefined,
          userId: userId.trim() || undefined,
          limit: 50,
          offset: 0,
        }),
        getAdminContentViolationStats(),
      ]);
      setBlockedUsers(blocked.users);
      setBlockedTotal(blocked.total);
      setRows(list.violations);
      setTotal(list.total);
      setStats(nextStats);
    } catch (e) {
      if (e instanceof Error && e.message === 'admin_forbidden') {
        setError('You are not authorized to view content violations.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load violations');
      }
    } finally {
      setLoading(false);
    }
  }, [surface, category, action, userStatus, hasRecipient, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUnblock(targetUserId: string) {
    const reason = window.prompt('Reason for unblock (required):');
    if (reason == null) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Unblock reason is required.');
      return;
    }
    setBusyUserId(targetUserId);
    setError(null);
    try {
      await unblockAdminContentUser(targetUserId, trimmed);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unblock failed');
    } finally {
      setBusyUserId(null);
    }
  }

  return {
    blockedUsers,
    blockedTotal,
    rows,
    stats,
    total,
    surface,
    setSurface,
    category,
    setCategory,
    action,
    setAction,
    userStatus,
    setUserStatus,
    hasRecipient,
    setHasRecipient,
    userId,
    setUserId,
    loading,
    error,
    busyUserId,
    reload: load,
    unblock: handleUnblock,
  };
}
