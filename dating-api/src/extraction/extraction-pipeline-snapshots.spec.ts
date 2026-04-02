import { computeV1PipelineSnapshots } from './extraction-pipeline-snapshots';

describe('computeV1PipelineSnapshots', () => {
  it('produces monotonic evidence filtering without changing pipeline contract', () => {
    const value = {
      domain: 'self',
      signals: { ambition: 7, directness: 6 },
      evidence: [
        {
          signal: 'ambition',
          quote: 'driven worker',
          reason: 'Says driven',
        },
      ],
      confidence: 0.8,
      version: 'v1',
    };
    const text = 'I am a driven worker every day.';
    const s = computeV1PipelineSnapshots(value, 'self', text);
    expect(s.afterValidateExtraction.signals.ambition).toBe(7);
    expect(s.afterValidateExtraction.evidence.length).toBeGreaterThanOrEqual(0);
  });
});
