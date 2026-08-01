/** Central TanStack Query keys (Sprint 29 Story 3). Do not inline ad-hoc key arrays. */

export const queryKeys = {
  me: {
    conversations: {
      unreadTotal: ['me', 'conversations', 'unread-total'] as const,
      list: ['me', 'conversations', 'list'] as const,
    },
  },
};
