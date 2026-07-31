import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCelebrationFlow } from './use-celebration-flow';

describe('useCelebrationFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with celebration hidden', () => {
    const { result } = renderHook(() => useCelebrationFlow());

    expect(result.current.showCelebration).toBe(false);
    expect(result.current.celebrationData).toBeNull();
  });

  it('should show celebration when triggered', () => {
    const { result } = renderHook(() => useCelebrationFlow());

    act(() => {
      result.current.triggerCelebration('conv-123');
    });

    expect(result.current.showCelebration).toBe(true);
    expect(result.current.celebrationData).toEqual({
      conversationId: 'conv-123',
    });
  });

  it('should auto-dismiss after default duration (5000ms)', () => {
    const { result } = renderHook(() => useCelebrationFlow());

    act(() => {
      result.current.triggerCelebration('conv-123');
    });

    expect(result.current.showCelebration).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4999);
    });

    expect(result.current.showCelebration).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.showCelebration).toBe(false);
    expect(result.current.celebrationData).toBeNull();
  });

  it('should auto-dismiss after custom duration', () => {
    const { result } = renderHook(() =>
      useCelebrationFlow({ autoHideDuration: 3000 }),
    );

    act(() => {
      result.current.triggerCelebration('conv-123');
    });

    expect(result.current.showCelebration).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2999);
    });

    expect(result.current.showCelebration).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.showCelebration).toBe(false);
  });

  it('should dismiss celebration manually', () => {
    const { result } = renderHook(() => useCelebrationFlow());

    act(() => {
      result.current.triggerCelebration('conv-123');
    });

    expect(result.current.showCelebration).toBe(true);

    act(() => {
      result.current.dismissCelebration();
    });

    expect(result.current.showCelebration).toBe(false);
    expect(result.current.celebrationData).toBeNull();
  });

  it('should clear timer on manual dismiss', () => {
    const { result } = renderHook(() => useCelebrationFlow());

    act(() => {
      result.current.triggerCelebration('conv-123');
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.dismissCelebration();
    });

    expect(result.current.showCelebration).toBe(false);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.showCelebration).toBe(false);
  });

  it('should replace previous celebration when triggered again', () => {
    const { result } = renderHook(() => useCelebrationFlow());

    act(() => {
      result.current.triggerCelebration('conv-123');
    });

    expect(result.current.celebrationData).toEqual({
      conversationId: 'conv-123',
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.triggerCelebration('conv-456');
    });

    expect(result.current.celebrationData).toEqual({
      conversationId: 'conv-456',
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.showCelebration).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.showCelebration).toBe(false);
  });

  it('should clean up timer on unmount', () => {
    const { result, unmount } = renderHook(() => useCelebrationFlow());

    act(() => {
      result.current.triggerCelebration('conv-123');
    });

    expect(result.current.showCelebration).toBe(true);

    unmount();

    act(() => {
      vi.advanceTimersByTime(10000);
    });
  });

  it('should handle multiple dismiss calls gracefully', () => {
    const { result } = renderHook(() => useCelebrationFlow());

    act(() => {
      result.current.triggerCelebration('conv-123');
    });

    act(() => {
      result.current.dismissCelebration();
    });

    expect(result.current.showCelebration).toBe(false);

    act(() => {
      result.current.dismissCelebration();
    });

    expect(result.current.showCelebration).toBe(false);
  });
});
