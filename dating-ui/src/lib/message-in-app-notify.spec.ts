import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MessageDto } from '@/lib/conversations-api';

const { getActiveConversationId } = vi.hoisted(() => ({
  getActiveConversationId: vi.fn(() => null as string | null),
}));

vi.mock('@/lib/conversation-focus', () => ({
  getActiveConversationId,
}));

import {
  isInAppNotificationsEnabled,
  shouldShowMessageToast,
} from '@/lib/message-in-app-notify';

const baseMsg: MessageDto = {
  id: 'msg_1',
  conversationId: 'conv_1',
  senderId: 'user_peer',
  text: 'hello',
  createdAt: '2026-06-06T12:00:00.000Z',
  status: 'SENT',
};

describe('shouldShowMessageToast', () => {
  beforeEach(() => {
    getActiveConversationId.mockReturnValue(null);
  });

  it('shows toast for peer message when thread is not active', () => {
    expect(shouldShowMessageToast(baseMsg, 'user_me')).toBe(true);
  });

  it('skips own messages', () => {
    expect(
      shouldShowMessageToast(
        { ...baseMsg, senderId: 'user_me' },
        'user_me',
      ),
    ).toBe(false);
  });

  it('skips when conversation is active', () => {
    getActiveConversationId.mockReturnValue('conv_1');
    expect(shouldShowMessageToast(baseMsg, 'user_me')).toBe(false);
  });

  it('skips when session user id is empty', () => {
    expect(shouldShowMessageToast(baseMsg, '')).toBe(false);
  });
});

describe('isInAppNotificationsEnabled', () => {
  it('defaults to true until Story 3', () => {
    expect(isInAppNotificationsEnabled()).toBe(true);
  });
});
