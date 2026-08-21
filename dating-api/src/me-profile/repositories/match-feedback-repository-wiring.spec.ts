import * as fs from 'node:fs';
import * as path from 'node:path';

describe('match feedback repository wiring', () => {
  const meProfileRoot = path.join(__dirname, '..');

  it('MeMatchFeedbackService injects MATCH_FEEDBACK_REPOSITORY', () => {
    const src = fs.readFileSync(
      path.join(meProfileRoot, 'me-match-feedback.service.ts'),
      'utf8',
    );
    expect(src).toContain('@Inject(MATCH_FEEDBACK_REPOSITORY)');
    expect(src).not.toMatch(/PrismaService/);
    expect(src).not.toMatch(/prisma\/prisma\.service/);
  });

  it('MeProfileModule registers the Prisma adapter', () => {
    const src = fs.readFileSync(
      path.join(meProfileRoot, 'me-profile.module.ts'),
      'utf8',
    );
    expect(src).toContain('MATCH_FEEDBACK_REPOSITORY');
    expect(src).toContain('useClass: PrismaMatchFeedbackRepository');
  });
});
