import * as fs from 'node:fs';
import * as path from 'node:path';

describe('enrichment alias removal (sprint-60 story 1)', () => {
  const dir = __dirname;

  it('does not ship enrichment-v3.ts or enrichment-v4.ts', () => {
    expect(fs.existsSync(path.join(dir, 'enrichment-v3.ts'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'enrichment-v4.ts'))).toBe(false);
  });

  it('prod enrichment entrypoints import V2 builder', () => {
    const orchestrator = fs.readFileSync(
      path.join(dir, 'evaluate-batch.orchestrator.ts'),
      'utf8',
    );
    const signals = fs.readFileSync(
      path.join(dir, 'enrichment-signals.ts'),
      'utf8',
    );
    expect(orchestrator).toContain("from './enrichment-v2'");
    expect(orchestrator).toContain('buildEnrichmentSignalsV2');
    expect(orchestrator).not.toMatch(/enrichment-v[34]|buildEnrichmentSignalsV[34]/);
    expect(signals).toContain("from './enrichment-v2'");
    expect(signals).toContain('buildEnrichmentSignalsV2');
    expect(signals).not.toMatch(/enrichment-v[34]|buildEnrichmentSignalsV[34]/);
  });
});
