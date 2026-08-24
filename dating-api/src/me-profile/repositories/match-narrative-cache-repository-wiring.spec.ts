import * as fs from 'node:fs';
import * as path from 'node:path';

describe('match narrative cache repository wiring (sprint-64 story 03)', () => {
  const meProfileRoot = path.join(__dirname, '..');
  const matchesRoot = path.join(meProfileRoot, '..', 'matches', 'match-narrative');

  it('MatchNarrativeCacheService injects MATCH_NARRATIVE_CACHE_REPOSITORY', () => {
    const src = fs.readFileSync(
      path.join(matchesRoot, 'match-narrative-cache.service.ts'),
      'utf8',
    );
    expect(src).toContain('@Inject(MATCH_NARRATIVE_CACHE_REPOSITORY)');
    expect(src).not.toMatch(/PrismaService/);
    expect(src).not.toMatch(/prisma\/prisma\.service/);
  });

  it('MeProfileModule registers the Prisma narrative cache adapter', () => {
    const src = fs.readFileSync(
      path.join(meProfileRoot, 'me-profile.module.ts'),
      'utf8',
    );
    expect(src).toContain('MATCH_NARRATIVE_CACHE_REPOSITORY');
    expect(src).toContain('useClass: PrismaMatchNarrativeCacheRepository');
  });

  it('MatchDetailService uses MatchNarrativeCacheService facade only', () => {
    const src = fs.readFileSync(
      path.join(meProfileRoot, 'matches', 'match-detail.service.ts'),
      'utf8',
    );
    expect(src).toContain('MatchNarrativeCacheService');
    expect(src).not.toMatch(/PrismaService/);
  });
});
