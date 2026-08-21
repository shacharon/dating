import * as fs from 'node:fs';
import * as path from 'node:path';

describe('account repository wiring', () => {
  const meAccountRoot = path.join(__dirname, '..');

  it('MeAccountService injects ACCOUNT_REPOSITORY', () => {
    const src = fs.readFileSync(
      path.join(meAccountRoot, 'me-account.service.ts'),
      'utf8',
    );
    expect(src).toContain('@Inject(ACCOUNT_REPOSITORY)');
    expect(src).not.toMatch(/PrismaService/);
    expect(src).not.toMatch(/prisma\/prisma\.service/);
  });

  it('MeAccountModule registers the Prisma adapter', () => {
    const src = fs.readFileSync(
      path.join(meAccountRoot, 'me-account.module.ts'),
      'utf8',
    );
    expect(src).toContain('ACCOUNT_REPOSITORY');
    expect(src).toContain('useClass: PrismaAccountRepository');
  });
});
