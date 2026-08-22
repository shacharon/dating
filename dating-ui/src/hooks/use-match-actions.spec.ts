/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMatchActions } from './use-match-actions';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const {
  likeMatch,
  passMatch,
  blockMatch,
  undoMatchAction,
  fetchMatchAction,
} = vi.hoisted(() => ({
  likeMatch: vi.fn(),
  passMatch: vi.fn(),
  blockMatch: vi.fn(),
  undoMatchAction: vi.fn(),
  fetchMatchAction: vi.fn(),
}));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    matches: {
      likeMatch,
      passMatch,
      blockMatch,
      undoMatchAction,
      fetchMatchAction,
    },
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientTestProvider,
    { client: createTestQueryClient() },
    children,
  );
}

describe('useMatchActions', () => {
  const mockMatchId = 'match-123';
  const mockOnMutualMatch = vi.fn();
  const mockOnActionSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(
      () => useMatchActions({ matchId: mockMatchId }),
      { wrapper },
    );

    expect(result.current.currentAction).toBeNull();
    expect(result.current.actionLoading).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.lastAction).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should initialize with initial action', () => {
    const { result } = renderHook(
      () => useMatchActions({ matchId: mockMatchId, initialAction: 'LIKE' }),
      { wrapper },
    );

    expect(result.current.currentAction).toBe('LIKE');
    expect(result.current.canUndo).toBe(true);
  });

  it('should handle like action successfully', async () => {
    const mockResult = {
      id: 'action-1',
      actorUserId: 'user-1',
      targetUserId: 'user-2',
      targetProfileIdSnapshot: 'profile-1',
      action: 'LIKE' as const,
      createdAt: '2024-01-01T00:00:00Z',
      mutualMatch: false,
      conversationId: null,
    };

    likeMatch.mockResolvedValue(mockResult);

    const { result } = renderHook(
      () =>
        useMatchActions({
          matchId: mockMatchId,
          onActionSuccess: mockOnActionSuccess,
        }),
      { wrapper },
    );

    act(() => {
      void result.current.like();
    });

    expect(result.current.actionLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.actionLoading).toBe(false);
    });

    expect(likeMatch).toHaveBeenCalledWith(mockMatchId);
    expect(result.current.currentAction).toBe('LIKE');
    expect(result.current.lastAction).toMatchObject({
      type: 'LIKE',
    });
    expect(mockOnActionSuccess).toHaveBeenCalledWith('LIKE');
    expect(result.current.error).toBeNull();
  });

  it('should trigger mutual match callback on mutual match', async () => {
    const mockResult = {
      id: 'action-1',
      actorUserId: 'user-1',
      targetUserId: 'user-2',
      targetProfileIdSnapshot: 'profile-1',
      action: 'LIKE' as const,
      createdAt: '2024-01-01T00:00:00Z',
      mutualMatch: true,
      conversationId: 'conv-123',
    };

    likeMatch.mockResolvedValue(mockResult);

    const { result } = renderHook(
      () =>
        useMatchActions({
          matchId: mockMatchId,
          onMutualMatch: mockOnMutualMatch,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.like();
    });

    expect(mockOnMutualMatch).toHaveBeenCalledWith('conv-123');
    expect(result.current.currentAction).toBe('LIKE');
  });

  it('should handle pass action successfully', async () => {
    const mockActionResult = {
      id: 'action-1',
      actorUserId: 'user-1',
      targetUserId: 'user-2',
      targetProfileIdSnapshot: 'profile-1',
      action: 'PASS' as const,
      createdAt: '2024-01-01T00:00:00Z',
      mutualMatch: false,
      conversationId: null,
    };

    const mockActionState = {
      action: 'PASS' as const,
      mutualMatch: false,
      conversationId: null,
    };

    passMatch.mockResolvedValue(mockActionResult);
    fetchMatchAction.mockResolvedValue(mockActionState);

    const { result } = renderHook(
      () =>
        useMatchActions({
          matchId: mockMatchId,
          onActionSuccess: mockOnActionSuccess,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.pass();
    });

    expect(passMatch).toHaveBeenCalledWith(mockMatchId);
    expect(fetchMatchAction).toHaveBeenCalledWith(mockMatchId);
    expect(result.current.currentAction).toBe('PASS');
    expect(mockOnActionSuccess).toHaveBeenCalledWith('PASS');
  });

  it('should handle block action successfully', async () => {
    const mockResult = {
      id: 'action-1',
      actorUserId: 'user-1',
      targetUserId: 'user-2',
      targetProfileIdSnapshot: 'profile-1',
      action: 'BLOCK' as const,
      createdAt: '2024-01-01T00:00:00Z',
      mutualMatch: false,
      conversationId: null,
    };

    blockMatch.mockResolvedValue(mockResult);

    const { result } = renderHook(
      () =>
        useMatchActions({
          matchId: mockMatchId,
          onActionSuccess: mockOnActionSuccess,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.block();
    });

    expect(blockMatch).toHaveBeenCalledWith(mockMatchId);
    expect(result.current.currentAction).toBe('BLOCK');
    expect(mockOnActionSuccess).toHaveBeenCalledWith('BLOCK');
  });

  it('should handle undo action successfully', async () => {
    const mockActionState = {
      action: null,
      mutualMatch: false,
      conversationId: null,
    };

    undoMatchAction.mockResolvedValue(undefined);
    fetchMatchAction.mockResolvedValue(mockActionState);

    const { result } = renderHook(
      () => useMatchActions({ matchId: mockMatchId, initialAction: 'LIKE' }),
      { wrapper },
    );

    expect(result.current.currentAction).toBe('LIKE');
    expect(result.current.canUndo).toBe(true);

    await act(async () => {
      await result.current.undo();
    });

    expect(undoMatchAction).toHaveBeenCalledWith(mockMatchId);
    expect(fetchMatchAction).toHaveBeenCalledWith(mockMatchId);
    expect(result.current.currentAction).toBeNull();
    expect(result.current.lastAction).toBeNull();
  });

  it('should not allow undo for BLOCK action', async () => {
    const { result } = renderHook(
      () => useMatchActions({ matchId: mockMatchId, initialAction: 'BLOCK' }),
      { wrapper },
    );

    expect(result.current.canUndo).toBe(false);

    await act(async () => {
      await result.current.undo();
    });

    expect(undoMatchAction).not.toHaveBeenCalled();
  });

  it('should handle like error with rollback', async () => {
    const mockError = new Error('Network error');
    likeMatch.mockRejectedValue(mockError);

    const { result } = renderHook(
      () => useMatchActions({ matchId: mockMatchId }),
      { wrapper },
    );

    await act(async () => {
      await result.current.like();
    });

    expect(result.current.currentAction).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('should handle pass error with rollback', async () => {
    const mockError = new Error('Network error');
    passMatch.mockRejectedValue(mockError);

    const { result } = renderHook(
      () => useMatchActions({ matchId: mockMatchId }),
      { wrapper },
    );

    await act(async () => {
      await result.current.pass();
    });

    expect(result.current.currentAction).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('should handle undo error with rollback', async () => {
    const mockError = new Error('Cannot undo');
    undoMatchAction.mockRejectedValue(mockError);

    const { result } = renderHook(
      () => useMatchActions({ matchId: mockMatchId, initialAction: 'LIKE' }),
      { wrapper },
    );

    const previousAction = result.current.currentAction;

    await act(async () => {
      await result.current.undo();
    });

    expect(result.current.currentAction).toBe(previousAction);
    expect(result.current.error).toBe('Cannot undo');
  });

  it('should prevent concurrent actions', async () => {
    likeMatch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    const { result } = renderHook(
      () => useMatchActions({ matchId: mockMatchId }),
      { wrapper },
    );

    act(() => {
      void result.current.like();
    });

    expect(result.current.actionLoading).toBe(true);

    act(() => {
      void result.current.pass();
    });

    expect(passMatch).not.toHaveBeenCalled();
  });

  it('should not allow action if current action exists', async () => {
    const { result } = renderHook(
      () => useMatchActions({ matchId: mockMatchId, initialAction: 'LIKE' }),
      { wrapper },
    );

    await act(async () => {
      await result.current.pass();
    });

    expect(passMatch).not.toHaveBeenCalled();
  });
});
