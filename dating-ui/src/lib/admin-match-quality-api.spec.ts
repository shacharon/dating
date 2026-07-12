import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatPositiveRate,
  getCandidateAudit,
  getMatchQualitySummary,
  listNegativeCandidates,
} from './admin-match-quality-api';

vi.mock('@/lib/api-base', () => ({
  getApiBase: () => 'http://api.test',
}));

describe('admin-match-quality-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getMatchQualitySummary builds query and maps 403', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getMatchQualitySummary(7)).rejects.toThrow('admin_forbidden');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/admin/match-quality/summary?windowDays=7',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('listNegativeCandidates builds pagination query', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        windowDays: 30,
        items: [],
        total: 0,
        limit: 20,
        offset: 20,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await listNegativeCandidates(30, 20, 20);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/admin/match-quality/negative-candidates?windowDays=30&limit=20&offset=20',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('formatPositiveRate returns em dash when null', () => {
    expect(formatPositiveRate(null)).toBe('—');
    expect(formatPositiveRate(0.625)).toBe('62.5%');
  });

  it('getCandidateAudit builds URL and maps 404', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCandidateAudit('cand_1', 7)).rejects.toThrow(
      'candidate_not_found',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/admin/match-quality/candidates/cand_1/audit?windowDays=7',
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
