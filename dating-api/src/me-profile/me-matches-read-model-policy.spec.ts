import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Static enforcement: `MeMatchesService` must treat `buildMeMatchesParticipantReadModel`
 * as the sole assembler of match-engine payloads and HG rows (no ad-hoc evaluation blob reads).
 */
describe('MeMatchesService read-model policy (source)', () => {
  const serviceSrc = fs.readFileSync(
    path.join(__dirname, 'me-matches.service.ts'),
    'utf8',
  );

  it('does not import or name low-level mapper builders', () => {
    expect(serviceSrc).not.toContain('buildProfilePayloadFromNewModel');
    expect(serviceSrc).not.toContain('buildChildrenUnsureRowFromNewModel');
  });

  it('does not reference evaluation blob fields in the service module', () => {
    expect(serviceSrc).not.toMatch(/\bevaluationJson\b/);
  });

  it('imports only the participant read-model builder from me-profile-engine.mapper', () => {
    const importLine = serviceSrc
      .split('\n')
      .find((l) => l.includes("from './me-profile-engine.mapper'"));
    expect(importLine).toBeDefined();
    expect(importLine).toContain('buildMeMatchesParticipantReadModel');
    expect(importLine!.split('{')[1]?.split('}')[0]?.trim()).toBe(
      'buildMeMatchesParticipantReadModel',
    );
  });
});
