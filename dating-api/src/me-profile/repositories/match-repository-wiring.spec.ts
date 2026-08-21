import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 62 Story 1 — match product services inject MATCH_REPOSITORY;
 * do not revive domain POC MatchesRepository under me-profile.
 */
describe('match repository wiring (sprint-62 story 1)', () => {
  const meProfileRoot = path.join(__dirname, '..');

  const successServices = [
    path.join(meProfileRoot, 'matches', 'match-ranking.service.ts'),
    path.join(meProfileRoot, 'matches', 'match-detail.service.ts'),
    path.join(meProfileRoot, 'matches', 'match-eligibility.service.ts'),
    path.join(meProfileRoot, 'matches', 'match-list-query.service.ts'),
    path.join(meProfileRoot, 'matches', 'match-list-cache.service.ts'),
    path.join(meProfileRoot, 'me-match-actions.service.ts'),
    path.join(meProfileRoot, 'mutual-matches.service.ts'),
  ];

  it('Success services inject MATCH_REPOSITORY and not PrismaService', () => {
    for (const file of successServices) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src).toContain('MATCH_REPOSITORY');
      expect(src).toContain('@Inject(MATCH_REPOSITORY)');
      expect(src).not.toMatch(/from ['"].*prisma\/prisma\.service['"]/);
      expect(src).not.toMatch(/PrismaService/);
    }
  });

  it('MeProfileModule registers MATCH_REPOSITORY via PrismaMatchRepository', () => {
    const src = fs.readFileSync(
      path.join(meProfileRoot, 'me-profile.module.ts'),
      'utf8',
    );
    expect(src).toContain('MATCH_REPOSITORY');
    expect(src).toContain('PrismaMatchRepository');
    expect(src).toContain('useClass: PrismaMatchRepository');
  });

  it('me-profile does not wire domain POC MatchesRepository', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        if (name === 'node_modules' || name.endsWith('.spec.ts')) continue;
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) {
          walk(full);
          continue;
        }
        if (!name.endsWith('.ts')) continue;
        const text = fs.readFileSync(full, 'utf8');
        if (
          /MatchesRepository|InMemoryMatchesRepository/.test(text) &&
          !full.includes(`${path.sep}repositories${path.sep}match.repository`)
        ) {
          // allow comments mentioning POC avoidance only if no import of domain matches.repository
          if (
            /from ['"].*domain\/repositories\/matches\.repository['"]/.test(
              text,
            ) ||
            /InMemoryMatchesRepository/.test(text)
          ) {
            hits.push(path.relative(meProfileRoot, full).replace(/\\/g, '/'));
          }
        }
      }
    };
    walk(meProfileRoot);
    expect(hits).toEqual([]);
  });

  it('PrismaMatchRepository is the only me-profile adapter using matchListRank writes', () => {
    const adapter = fs.readFileSync(
      path.join(meProfileRoot, 'repositories', 'prisma-match.repository.ts'),
      'utf8',
    );
    expect(adapter).toContain('replaceRankSnapshot');
    expect(adapter).toContain('MATCH_LIST_RANK_PERSIST_CHUNK');
    expect(adapter).toContain('MATCH_LIST_RANK_PERSIST_TX');
    expect(adapter).toContain('upsertActionAndDetectMutual');
    expect(adapter).toContain('$transaction');
  });
});
