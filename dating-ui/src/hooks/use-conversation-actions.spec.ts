/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useConversationActions } from './use-conversation-actions';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { unmatchMyConversation } = vi.hoisted(() => ({
  unmatchMyConversation: vi.fn(),
}));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    conversations: {
      unmatchMyConversation,
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const mockUnmatchMyConversation = vi.mocked(unmatchMyConversation);
const mockPush = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientTestProvider,
    { client: createTestQueryClient() },
    children,
  );
}

describe('useConversationActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
  });

  it('should unmatch conversation successfully', async () => {
    mockUnmatchMyConversation.mockResolvedValue(undefined);

    const { result } = renderHook(() => useConversationActions('conv-1'), {
      wrapper,
    });

    expect(result.current.unmatching).toBe(false);
    expect(result.current.unmatchError).toBeNull();

    await result.current.unmatch();

    await waitFor(() => {
      expect(result.current.unmatching).toBe(false);
    });

    expect(mockUnmatchMyConversation).toHaveBeenCalledWith('conv-1');
    expect(mockPush).toHaveBeenCalledWith('/dating/conversations');
    expect(result.current.unmatchError).toBeNull();
  });

  it('should handle unmatch error', async () => {
    const errorMessage = 'Unmatch failed';
    mockUnmatchMyConversation.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useConversationActions('conv-1'), {
      wrapper,
    });

    await expect(result.current.unmatch()).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.unmatchError).toBe(errorMessage);
    });

    expect(result.current.unmatching).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should not unmatch when already unmatching', async () => {
    mockUnmatchMyConversation.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    const { result } = renderHook(() => useConversationActions('conv-1'), {
      wrapper,
    });

    const firstUnmatch = result.current.unmatch();

    await waitFor(() => {
      expect(result.current.unmatching).toBe(true);
    });

    const secondUnmatch = result.current.unmatch();

    await firstUnmatch;
    await secondUnmatch;

    expect(mockUnmatchMyConversation).toHaveBeenCalledTimes(1);
  });

  it('should clear unmatch error', async () => {
    const errorMessage = 'Unmatch failed';
    mockUnmatchMyConversation.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useConversationActions('conv-1'), {
      wrapper,
    });

    await expect(result.current.unmatch()).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.unmatchError).toBe(errorMessage);
    });

    act(() => {
      result.current.clearUnmatchError();
    });

    expect(result.current.unmatchError).toBeNull();
  });

  it('should not unmatch without conversation ID', async () => {
    const { result } = renderHook(() => useConversationActions(''), {
      wrapper,
    });

    await result.current.unmatch();

    expect(mockUnmatchMyConversation).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should handle generic error message', async () => {
    mockUnmatchMyConversation.mockRejectedValue('Non-error object');

    const { result } = renderHook(() => useConversationActions('conv-1'), {
      wrapper,
    });

    await expect(result.current.unmatch()).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.unmatchError).toBe('Failed to unmatch');
    });
  });
});
