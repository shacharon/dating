/** Central TanStack Query keys (Sprint 29 Story 3). Do not inline ad-hoc key arrays. */

export const queryKeys = {
  me: {
    conversations: {
      unreadTotal: ['me', 'conversations', 'unread-total'] as const,
      list: ['me', 'conversations', 'list'] as const,
    },
  },
  admin: {
    contentViolations: {
      list: (filters: Record<string, string>) =>
        ['admin', 'content-violations', 'list', filters] as const,
      stats: ['admin', 'content-violations', 'stats'] as const,
      blocked: ['admin', 'content-violations', 'blocked'] as const,
    },
    reports: {
      list: (status: string) =>
        ['admin', 'reports', 'list', status] as const,
      detail: (id: string) =>
        ['admin', 'reports', 'detail', id] as const,
    },
  },
};
