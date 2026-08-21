import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 62 Story 4 — photo consumers inject PROFILE_PHOTO_REPOSITORY;
 * token lives on PhotoStorageModule; MATCH_QUERY photo gate methods stay.
 */
describe('profile photo repository wiring (sprint-62 story 4)', () => {
  const srcRoot = path.join(__dirname, '..', '..');
  const meProfileRoot = path.join(__dirname, '..');

  const successServices = [
    path.join(meProfileRoot, 'profile', 'profile-photo.service.ts'),
    path.join(srcRoot, 'admin', 'admin-photos', 'admin-photos.service.ts'),
    path.join(srcRoot, 'photo-storage', 'photo-moderation.service.ts'),
    path.join(srcRoot, 'workers', 'photo-sla.cron.ts'),
  ];

  it('Success services inject PROFILE_PHOTO_REPOSITORY and not PrismaService', () => {
    for (const file of successServices) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src).toContain('PROFILE_PHOTO_REPOSITORY');
      expect(src).toContain('@Inject(PROFILE_PHOTO_REPOSITORY)');
      expect(src).not.toMatch(/from ['"].*prisma\/prisma\.service['"]/);
      expect(src).not.toMatch(/PrismaService/);
    }
  });

  it('PhotoStorageModule (Global) provides and exports PROFILE_PHOTO_REPOSITORY', () => {
    const src = fs.readFileSync(
      path.join(srcRoot, 'photo-storage', 'photo-storage.module.ts'),
      'utf8',
    );
    expect(src).toContain('@Global()');
    expect(src).toContain('PrismaModule');
    expect(src).toContain('PROFILE_PHOTO_REPOSITORY');
    expect(src).toContain('PrismaProfilePhotoRepository');
    expect(src).toContain('useClass: PrismaProfilePhotoRepository');
    expect(src).toMatch(/exports:\s*\[[\s\S]*PROFILE_PHOTO_REPOSITORY/);
  });

  it('ProfilePhotoService keeps PHOTO_STORAGE; PhotoModerationService keeps REKOGNITION', () => {
    const me = fs.readFileSync(
      path.join(meProfileRoot, 'profile', 'profile-photo.service.ts'),
      'utf8',
    );
    const mod = fs.readFileSync(
      path.join(srcRoot, 'photo-storage', 'photo-moderation.service.ts'),
      'utf8',
    );
    expect(me).toContain('PHOTO_STORAGE');
    expect(me).toContain('setPrimaryExclusive');
    expect(mod).toContain('REKOGNITION');
    expect(mod).toContain('conditionalApproveAndMaybeSetPrimary');
    expect(mod).toContain('conditionalUpdateModeration');
  });

  it('MATCH_QUERY_REPOSITORY still owns photo gate methods (not folded into photo repo)', () => {
    const match = fs.readFileSync(
      path.join(meProfileRoot, 'repositories', 'match-query.repository.ts'),
      'utf8',
    );
    const photo = fs.readFileSync(
      path.join(meProfileRoot, 'repositories', 'profile-photo.repository.ts'),
      'utf8',
    );
    expect(match).toContain('countApprovedPhotosForProfile');
    expect(match).toContain('findApprovedPrimaryPhoto');
    expect(photo).not.toContain('countApprovedPhotosForProfile');
  });
});
