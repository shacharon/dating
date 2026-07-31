import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMatchFeedback } from './use-match-feedback';
import * as api from '@/lib/me-matches-api';

vi.mock('@/lib/me-matches-api');

describe('useMatchFeedback', () => {
  const mockMatchId = 'match-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useMatchFeedback({ matchId: mockMatchId }),
    );

    expect(result.current.sentiment).toBeNull();
    expect(result.current.submitting).toBe(false);
    expect(result.current.submitted).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should initialize with initial sentiment', () => {
    const { result } = renderHook(() =>
      useMatchFeedback({ matchId: mockMatchId, initialSentiment: 'POSITIVE' }),
    );

    expect(result.current.sentiment).toBe('POSITIVE');
  });

  it('should submit positive feedback successfully', async () => {
    const mockResult = {
      matchProfileId: mockMatchId,
      sentiment: 'POSITIVE' as const,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(api.upsertMatchFeedback).mockResolvedValue(mockResult);

    const { result } = renderHook(() =>
      useMatchFeedback({ matchId: mockMatchId }),
    );

    act(() => {
      result.current.submitFeedback('positive');
    });

    expect(result.current.submitting).toBe(true);

    await waitFor(() => {
      expect(result.current.submitting).toBe(false);
    });

    expect(api.upsertMatchFeedback).toHaveBeenCalledWith(
      mockMatchId,
      'positive',
    );
    expect(result.current.sentiment).toBe('POSITIVE');
    expect(result.current.submitted).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should submit negative feedback successfully', async () => {
    const mockResult = {
      matchProfileId: mockMatchId,
      sentiment: 'NEGATIVE' as const,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(api.upsertMatchFeedback).mockResolvedValue(mockResult);

    const { result } = renderHook(() =>
      useMatchFeedback({ matchId: mockMatchId }),
    );

    await act(async () => {
      await result.current.submitFeedback('negative');
    });

    expect(api.upsertMatchFeedback).toHaveBeenCalledWith(
      mockMatchId,
      'negative',
    );
    expect(result.current.sentiment).toBe('NEGATIVE');
    expect(result.current.submitted).toBe(true);
  });

  it('should handle submission error', async () => {
    const mockError = new Error('Network error');
    vi.mocked(api.upsertMatchFeedback).mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useMatchFeedback({ matchId: mockMatchId }),
    );

    await act(async () => {
      await result.current.submitFeedback('positive');
    });

    expect(result.current.sentiment).toBeNull();
    expect(result.current.submitted).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  it('should handle non-Error rejection', async () => {
    vi.mocked(api.upsertMatchFeedback).mockRejectedValue('String error');

    const { result } = renderHook(() =>
      useMatchFeedback({ matchId: mockMatchId }),
    );

    await act(async () => {
      await result.current.submitFeedback('positive');
    });

    expect(result.current.error).toBe('Could not submit feedback.');
  });

  it('should prevent concurrent submissions', async () => {
    vi.mocked(api.upsertMatchFeedback).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    const { result } = renderHook(() =>
      useMatchFeedback({ matchId: mockMatchId }),
    );

    act(() => {
      result.current.submitFeedback('positive');
    });

    expect(result.current.submitting).toBe(true);

    act(() => {
      result.current.submitFeedback('negative');
    });

    await waitFor(() => {
      expect(result.current.submitting).toBe(false);
    });

    expect(api.upsertMatchFeedback).toHaveBeenCalledTimes(1);
    expect(api.upsertMatchFeedback).toHaveBeenCalledWith(
      mockMatchId,
      'positive',
    );
  });

  it('should allow updating sentiment via setSentiment', () => {
    const { result } = renderHook(() =>
      useMatchFeedback({ matchId: mockMatchId }),
    );

    expect(result.current.sentiment).toBeNull();

    act(() => {
      result.current.setSentiment('POSITIVE');
    });

    expect(result.current.sentiment).toBe('POSITIVE');
  });
});
