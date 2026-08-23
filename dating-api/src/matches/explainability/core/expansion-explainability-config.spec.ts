import {
  EXPANSION_EXPLAINABILITY_CONFIGS,
} from './expansion-explainability-config';

describe('EXPANSION_EXPLAINABILITY_CONFIGS (sprint-60 story 3)', () => {
  it('has 13 expansions with unique ids', () => {
    expect(EXPANSION_EXPLAINABILITY_CONFIGS).toHaveLength(13);
    const ids = EXPANSION_EXPLAINABILITY_CONFIGS.map((c) => c.id);
    expect(new Set(ids).size).toBe(13);
  });

  it('does not include expansion-08 or expansion-09', () => {
    const ids = EXPANSION_EXPLAINABILITY_CONFIGS.map((c) => c.id);
    expect(ids).not.toContain('expansion-08');
    expect(ids).not.toContain('expansion-09');
  });

  it('marks standard vs custom kinds', () => {
    const byId = Object.fromEntries(
      EXPANSION_EXPLAINABILITY_CONFIGS.map((c) => [c.id, c.kind]),
    );
    for (const id of [
      'expansion-01',
      'expansion-02',
      'expansion-03',
      'expansion-04',
      'expansion-05',
      'expansion-06',
      'expansion-10',
    ]) {
      expect(byId[id]).toBe('standard');
    }
    for (const id of [
      'expansion-07',
      'expansion-11',
      'expansion-12',
      'expansion-13',
      'expansion-14',
      'expansion-15',
    ]) {
      expect(byId[id]).toBe('custom');
    }
  });

  it('every chip key has label and domain', () => {
    for (const cfg of EXPANSION_EXPLAINABILITY_CONFIGS) {
      for (const key of cfg.shadowChipKeys) {
        expect(cfg.positiveChipBySignal[key]?.length).toBeGreaterThan(0);
        expect(cfg.signalDomain[key]?.length).toBeGreaterThan(0);
      }
    }
  });
});
