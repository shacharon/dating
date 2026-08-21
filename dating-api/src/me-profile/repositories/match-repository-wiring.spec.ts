import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 62 Story 1 / Sprint 63 Story 4 — match product services inject match
 * repository tokens (facade or ISP facets); no PrismaService in Success paths.
 */
describe('match repository wiring (sprint-62/63)', () => {
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

  const matchRepoToken =
    /MATCH_(?:QUERY_|ACTIONS_|RANK_)?REPOSITORY/;

  it('Success services inject a match repository token and not PrismaService', () => {
    for (const file of successServices) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src).toMatch(matchRepoToken);
      expect(src).toMatch(/@Inject\(MATCH_(?:QUERY_|ACTIONS_|RANK_)?REPOSITORY\)/);
      expect(src).not.toMatch(/from ['"].*prisma\/prisma\.service['"]/);
      expect(src).not.toMatch(/PrismaService/);
    }
  });

  it('profile-quality and analysis-submit inject MATCH_QUERY_REPOSITORY', () => {
    const files = [
      path.join(meProfileRoot, 'profile-quality.service.ts'),
      path.join(meProfileRoot, 'profile', 'profile-analysis-submit.service.ts'),
    ];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src).toContain('MATCH_QUERY_REPOSITORY');
      expect(src).toContain('@Inject(MATCH_QUERY_REPOSITORY)');
      expect(src).not.toMatch(/PrismaService/);
    }
  });

  it('MeProfileModule registers facade + facet tokens via PrismaMatchRepository', () => {
    const src = fs.readFileSync(
      path.join(meProfileRoot, 'me-profile.module.ts'),
      'utf8',
    );
    expect(src).toContain('MATCH_REPOSITORY');
    expect(src).toContain('MATCH_QUERY_REPOSITORY');
    expect(src).toContain('MATCH_ACTIONS_REPOSITORY');
    expect(src).toContain('MATCH_RANK_REPOSITORY');
    expect(src).toContain('PrismaMatchRepository');
    expect(src).toContain('useClass: PrismaMatchRepository');
    expect(src).toContain('useExisting: MATCH_REPOSITORY');
  });

  it('match port files do not expose Prisma UserProfileSelect / WhereInput', () => {
    const portFiles = [
      'match.repository.ts',
      'match-query.repository.ts',
      'match-actions.repository.ts',
      'match-rank.repository.ts',
    ];
    for (const name of portFiles) {
      const src = fs.readFileSync(
        path.join(meProfileRoot, 'repositories', name),
        'utf8',
      );
      expect(src).not.toMatch(/UserProfileSelect|UserProfileWhereInput|UserProfileOrderBy/);
      expect(src).not.toMatch(/Prisma\.UserProfile/);
    }
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
