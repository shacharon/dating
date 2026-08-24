import fs from 'node:fs';
import path from 'node:path';

const evaluateDir = path.join(__dirname);

describe('evaluate/ directory layout (Sprint 73 Story 03)', () => {
  it('includes README.md at module root', () => {
    expect(fs.existsSync(path.join(evaluateDir, 'README.md'))).toBe(true);
  });

  it('keeps orchestration anchors at root', () => {
    for (const name of [
      'evaluate.service.ts',
      'evaluate-batch.orchestrator.ts',
      'evaluate-public-api.ts',
      'enrichment-v2.ts',
    ]) {
      expect(fs.existsSync(path.join(evaluateDir, name))).toBe(true);
    }
  });

  it('keeps Nest module wiring at root', () => {
    for (const name of ['evaluate.module.ts', 'evaluate-service.module.ts']) {
      expect(fs.existsSync(path.join(evaluateDir, name))).toBe(true);
    }
  });
});
