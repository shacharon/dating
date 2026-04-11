import { tryPickHolyGrailMatchDiagnosticsDto } from './holy-grail-match-diagnostics.wire';

describe('tryPickHolyGrailMatchDiagnosticsDto', () => {
  it('accepts a valid triple', () => {
    expect(
      tryPickHolyGrailMatchDiagnosticsDto({
        hgMutualPass: true,
        hgOverallStatus: 'PASS:PASS',
        hgRankScore: 0,
      }),
    ).toEqual({
      hgMutualPass: true,
      hgOverallStatus: 'PASS:PASS',
      hgRankScore: 0,
    });
  });

  it('trims hgOverallStatus', () => {
    expect(
      tryPickHolyGrailMatchDiagnosticsDto({
        hgMutualPass: false,
        hgOverallStatus: '  PASS:FAIL ',
        hgRankScore: 2,
      })?.hgOverallStatus,
    ).toBe('PASS:FAIL');
  });

  it('rejects partial or invalid shapes', () => {
    expect(tryPickHolyGrailMatchDiagnosticsDto(undefined)).toBeUndefined();
    expect(tryPickHolyGrailMatchDiagnosticsDto({})).toBeUndefined();
    expect(
      tryPickHolyGrailMatchDiagnosticsDto({
        hgMutualPass: true,
        hgOverallStatus: 'PASS:PASS',
      }),
    ).toBeUndefined();
    expect(
      tryPickHolyGrailMatchDiagnosticsDto({
        hgMutualPass: true,
        hgOverallStatus: 'SOFT_PASS:PASS',
        hgRankScore: 0,
      }),
    ).toBeUndefined();
    expect(
      tryPickHolyGrailMatchDiagnosticsDto({
        hgMutualPass: 'yes',
        hgOverallStatus: 'PASS:PASS',
        hgRankScore: 0,
      }),
    ).toBeUndefined();
  });
});
