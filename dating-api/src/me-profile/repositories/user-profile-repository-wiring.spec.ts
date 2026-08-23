import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 63 Story 3 — analysis + legacy profile-matches inject USER_PROFILE_REPOSITORY.
 */
describe('user profile repository wiring (sprint-63 story 3)', () => {
  const meProfileRoot = path.join(__dirname, '..');

  const successServices = [
    path.join(meProfileRoot, 'profile', 'me-profile-analysis.service.ts'),
    path.join(meProfileRoot, 'matches', 'core', 'me-profile-matches.service.ts'),
    path.join(meProfileRoot, 'profile', 'profile-crud.service.ts'),
    path.join(meProfileRoot, 'profile', 'profile-analysis-submit.service.ts'),
  ];

  it('Success services inject USER_PROFILE_REPOSITORY and not PrismaService', () => {
    for (const file of successServices) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src).toContain('USER_PROFILE_REPOSITORY');
      expect(src).toContain('@Inject(USER_PROFILE_REPOSITORY)');
      expect(src).not.toMatch(/from ['"].*prisma\/prisma\.service['"]/);
      expect(src).not.toMatch(/PrismaService/);
    }
  });

  it('MeProfileModule registers USER_PROFILE_REPOSITORY via PrismaUserProfileRepository', () => {
    const src = fs.readFileSync(
      path.join(meProfileRoot, 'me-profile.module.ts'),
      'utf8',
    );
    expect(src).toContain('USER_PROFILE_REPOSITORY');
    expect(src).toContain('PrismaUserProfileRepository');
    expect(src).toContain('useClass: PrismaUserProfileRepository');
  });

  it('IUserProfileRepository owns analysis persist + legacy matches methods', () => {
    const src = fs.readFileSync(
      path.join(__dirname, 'user-profile.repository.ts'),
      'utf8',
    );
    expect(src).toContain('persistAnalysisSuccess');
    expect(src).toContain('markAnalyzing');
    expect(src).toContain('markAnalysisFailed');
    expect(src).toContain('listLegacyAnalyzedCandidatesExcludingUser');
  });
});
