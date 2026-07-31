import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMatchActions } from './use-match-actions';
import * as api from '@/lib/me-matches-api';

vi.mock('@/lib/me-matches-api');

describe('useMatchActions', () => {
  const mockMatchId = 'match-123';
  const mockOnMutualMatch = vi.fn();
  const mockOnActionSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useMatchActions({ matchId: mockMatchId }),
    );

    expect(result.current.currentAction).toBeNull();
    expect(result.current.actionLoading).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.lastAction).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should initialize with initial action', () => {
    const { result } = renderHook(() =>
      useMatchActions({ matchId: mockMatchId, initialAction: 'LIKE' }),
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

    vi.mocked(api.likeMatch).mockResolvedValue(mockResult);

    const { result } = renderHook(() =>
      useMatchActions({
        matchId: mockMatchId,
        onActionSuccess: mockOnActionSuccess,
      }),
    );

    act(() => {
      result.current.like();
    });

    expect(result.current.actionLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.actionLoading).toBe(false);
    });

    expect(api.likeMatch).toHaveBeenCalledWith(mockMatchId);
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

    vi.mocked(api.likeMatch).mockResolvedValue(mockResult);

    const { result } = renderHook(() =>
      useMatchActions({
        matchId: mockMatchId,
        onMutualMatch: mockOnMutualMatch,
      }),
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

    vi.mocked(api.passMatch).mockResolvedValue(mockActionResult);
    vi.mocked(api.fetchMatchAction).mockResolvedValue(mockActionState);

    const { result } = renderHook(() =>
      useMatchActions({
        matchId: mockMatchId,
        onActionSuccess: mockOnActionSuccess,
      }),
    );

    await act(async () => {
      await result.current.pass();
    });

    expect(api.passMatch).toHaveBeenCalledWith(mockMatchId);
    expect(api.fetchMatchAction).toHaveBeenCalledWith(mockMatchId);
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

    vi.mocked(api.blockMatch).mockResolvedValue(mockResult);

    const { result } = renderHook(() =>
      useMatchActions({
        matchId: mockMatchId,
        onActionSuccess: mockOnActionSuccess,
      }),
    );

    await act(async () => {
      await result.current.block();
    });

    expect(api.blockMatch).toHaveBeenCalledWith(mockMatchId);
    expect(result.current.currentAction).toBe('BLOCK');
    expect(mockOnActionSuccess).toHaveBeenCalledWith('BLOCK');
  });

  it('should handle undo action successfully', async () => {
    const mockActionState = {
      action: null,
      mutualMatch: false,
      conversationId: null,
    };

    vi.mocked(api.undoMatchAction).mockResolvedValue(undefined);
    vi.mocked(api.fetchMatchAction).mockResolvedValue(mockActionState);

    const { result } = renderHook(() =>
      useMatchActions({ matchId: mockMatchId, initialAction: 'LIKE' }),
    );

    expect(result.current.currentAction).toBe('LIKE');
    expect(result.current.canUndo).toBe(true);

    await act(async () => {
      await result.current.undo();
    });

    expect(api.undoMatchAction).toHaveBeenCalledWith(mockMatchId);
    expect(api.fetchMatchAction).toHaveBeenCalledWith(mockMatchId);
    expect(result.current.currentAction).toBeNull();
    expect(result.current.lastAction).toBeNull();
  });

  it('should not allow undo for BLOCK action', async () => {
    const { result } = renderHook(() =>
      useMatchActions({ matchId: mockMatchId, initialAction: 'BLOCK' }),
    );

    expect(result.current.canUndo).toBe(false);

    await act(async () => {
      await result.current.undo();
    });

    expect(api.undoMatchAction).not.toHaveBeenCalled();
  });

  it('should handle like error with rollback', async () => {
    const mockError = new Error('Network error');
    vi.mocked(api.likeMatch).mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useMatchActions({ matchId: mockMatchId }),
    );

    await act(async () => {
      await result.current.like();
    });

    expect(result.current.currentAction).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('should handle pass error with rollback', async () => {
    const mockError = new Error('Network error');
    vi.mocked(api.passMatch).mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useMatchActions({ matchId: mockMatchId }),
    );

    await act(async () => {
      await result.current.pass();
    });

    expect(result.current.currentAction).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('should handle undo error with rollback', async () => {
    const mockError = new Error('Cannot undo');
    vi.mocked(api.undoMatchAction).mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useMatchActions({ matchId: mockMatchId, initialAction: 'LIKE' }),
    );

    const previousAction = result.current.currentAction;

    await act(async () => {
      await result.current.undo();
    });

    expect(result.current.currentAction).toBe(previousAction);
    expect(result.current.error).toBe('Cannot undo');
  });

  it('should prevent concurrent actions', async () => {
    vi.mocked(api.likeMatch).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    const { result } = renderHook(() =>
      useMatchActions({ matchId: mockMatchId }),
    );

    act(() => {
      result.current.like();
    });

    expect(result.current.actionLoading).toBe(true);

    act(() => {
      result.current.pass();
    });

    expect(api.passMatch).not.toHaveBeenCalled();
  });

  it('should not allow action if current action exists', async () => {
    const { result } = renderHook(() =>
      useMatchActions({ matchId: mockMatchId, initialAction: 'LIKE' }),
    );

    await act(async () => {
      await result.current.pass();
    });

    expect(api.passMatch).not.toHaveBeenCalled();
  });
});
