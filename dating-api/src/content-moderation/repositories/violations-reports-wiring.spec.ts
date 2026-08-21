import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 62 Story 3 — product + admin violation/report services inject
 * CONTENT_VIOLATION_REPOSITORY / REPORT_REPOSITORY; enforcement policy stays in service.
 */
describe('violations + reports repository wiring (sprint-62 story 3)', () => {
  const srcRoot = path.join(__dirname, '..', '..');

  const violationServices = [
    path.join('content-moderation', 'content-violation.service.ts'),
    path.join(
      'admin',
      'admin-content-violations',
      'admin-content-violations.service.ts',
    ),
  ];

  const reportServices = [
    path.join('reports', 'reports.service.ts'),
    path.join('admin', 'admin-reports', 'admin-reports.service.ts'),
  ];

  it('violation Success services inject CONTENT_VIOLATION_REPOSITORY and not PrismaService', () => {
    for (const rel of violationServices) {
      const src = fs.readFileSync(path.join(srcRoot, rel), 'utf8');
      expect(src).toContain('CONTENT_VIOLATION_REPOSITORY');
      expect(src).toContain('@Inject(CONTENT_VIOLATION_REPOSITORY)');
      expect(src).not.toMatch(/from ['"].*prisma\/prisma\.service['"]/);
      expect(src).not.toMatch(/PrismaService/);
    }
  });

  it('report Success services inject REPORT_REPOSITORY and not PrismaService', () => {
    for (const rel of reportServices) {
      const src = fs.readFileSync(path.join(srcRoot, rel), 'utf8');
      expect(src).toContain('REPORT_REPOSITORY');
      expect(src).toContain('@Inject(REPORT_REPOSITORY)');
      expect(src).not.toMatch(/from ['"].*prisma\/prisma\.service['"]/);
      expect(src).not.toMatch(/PrismaService/);
    }
  });

  it('modules provide/export repository tokens', () => {
    const cm = fs.readFileSync(
      path.join(srcRoot, 'content-moderation', 'content-moderation.module.ts'),
      'utf8',
    );
    const reports = fs.readFileSync(
      path.join(srcRoot, 'reports', 'reports.module.ts'),
      'utf8',
    );
    const admin = fs.readFileSync(
      path.join(srcRoot, 'admin', 'admin.module.ts'),
      'utf8',
    );
    expect(cm).toContain('CONTENT_VIOLATION_REPOSITORY');
    expect(cm).toContain('PrismaContentViolationRepository');
    expect(cm).toContain('exports:');
    expect(reports).toContain('REPORT_REPOSITORY');
    expect(reports).toContain('PrismaReportRepository');
    expect(reports).toContain('exports: [REPORT_REPOSITORY]');
    expect(admin).toContain('ReportsModule');
    expect(admin).toContain('ContentModerationModule');
  });

  it('enforcement thresholds remain in ContentViolationService (not adapter)', () => {
    const service = fs.readFileSync(
      path.join(srcRoot, 'content-moderation', 'content-violation.service.ts'),
      'utf8',
    );
    const adapter = fs.readFileSync(
      path.join(
        srcRoot,
        'content-moderation',
        'repositories',
        'prisma-content-violation.repository.ts',
      ),
      'utf8',
    );
    expect(service).toContain('count < 3');
    expect(service).toContain('lifetime >= 20');
    expect(service).toContain('daily >= 10');
    expect(service).toContain('hourly >= 3');
    expect(service).toContain('ENFORCEMENT_HOUR_MS');
    expect(service).toContain('ENFORCEMENT_DAY_MS');
    expect(adapter).not.toContain('lifetime >= 20');
    expect(adapter).not.toContain('ENFORCEMENT_HOUR_MS');
    expect(adapter).toContain('createViolationAndIncrementCount');
    expect(adapter).toContain('$transaction');
  });

  it('reports service keeps REPORT_DEBOUNCE_MS; adapter has no debounce constant', () => {
    const service = fs.readFileSync(
      path.join(srcRoot, 'reports', 'reports.service.ts'),
      'utf8',
    );
    const adapter = fs.readFileSync(
      path.join(srcRoot, 'reports', 'repositories', 'prisma-report.repository.ts'),
      'utf8',
    );
    expect(service).toContain('REPORT_DEBOUNCE_MS');
    expect(adapter).not.toContain('REPORT_DEBOUNCE_MS');
  });
});
