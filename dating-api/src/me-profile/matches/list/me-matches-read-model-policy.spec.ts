import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Static enforcement: match scoring collaborators must treat `buildMeMatchesParticipantReadModel`
 * as the sole assembler of match-engine payloads and HG rows (no ad-hoc evaluation blob reads).
 *
 * Human-readable V1 contract: `docs/MATCH_ENGINE_V1_CONTRACT.md`.
 */
describe('MeMatchesService read-model policy (source)', () => {
  const scoringSrc = [
    fs.readFileSync(
      path.join(__dirname, '../core/me-matches.service.ts'),
      'utf8',
    ),
    fs.readFileSync(
      path.join(__dirname, 'ranking/match-ranking.service.ts'),
      'utf8',
    ),
    fs.readFileSync(
      path.join(__dirname, 'ranking/match-list-candidate-loader.service.ts'),
      'utf8',
    ),
    fs.readFileSync(
      path.join(__dirname, 'ranking/match-list-candidate-scorer.service.ts'),
      'utf8',
    ),
    fs.readFileSync(
      path.join(__dirname, 'ranking/match-list-response-assembler.service.ts'),
      'utf8',
    ),
    fs.readFileSync(
      path.join(__dirname, '../detail/match-detail-query.service.ts'),
      'utf8',
    ),
  ].join('\n');

  it('does not import or name low-level mapper builders', () => {
    expect(scoringSrc).not.toContain('buildProfilePayloadFromNewModel');
    expect(scoringSrc).not.toContain('buildChildrenUnsureRowFromNewModel');
  });

  it('does not reference evaluation blob fields in the service module', () => {
    expect(scoringSrc).not.toMatch(/\bevaluationJson\b/);
  });

  it('imports only the participant read-model builder from me-profile-engine.mapper', () => {
    const importLines = scoringSrc
      .split('\n')
      .filter(
        (l) =>
          l.includes("from '../../../me-profile-engine.mapper'") ||
          l.includes("from '../../profile/me-profile-engine.mapper'"),
      );
    expect(importLines.length).toBeGreaterThan(0);
    for (const importLine of importLines) {
      expect(importLine).toContain('buildMeMatchesParticipantReadModel');
      expect(importLine.split('{')[1]?.split('}')[0]?.trim()).toBe(
        'buildMeMatchesParticipantReadModel',
      );
    }
  });
});
