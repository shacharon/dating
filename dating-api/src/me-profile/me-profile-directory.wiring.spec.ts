import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const meProfileDir = path.join(__dirname);
const apiRoot = path.join(__dirname, '../..');

function countFilesRecursive(dir: string): number {
  let count = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) count += countFilesRecursive(full);
    else count += 1;
  }
  return count;
}

function topDirs(): string[] {
  return fs
    .readdirSync(meProfileDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

describe('me-profile/ directory layout (Sprint 70)', () => {
  it('keeps root file count at or below 15', () => {
    const rootFiles = fs
      .readdirSync(meProfileDir, { withFileTypes: true })
      .filter((f) => f.isFile());
    expect(rootFiles.length).toBeLessThanOrEqual(15);
  });

  it('includes README.md at module root', () => {
    expect(fs.existsSync(path.join(meProfileDir, 'README.md'))).toBe(true);
  });

  it('keeps feature folders at or below 25 files (repositories grandfathered)', () => {
    const caps: Array<{ label: string; dir: string; max: number }> = [];
    for (const dir of topDirs()) {
      if (dir === 'matches') {
        for (const sub of fs.readdirSync(path.join(meProfileDir, 'matches'), {
          withFileTypes: true,
        })) {
          if (!sub.isDirectory()) continue;
          caps.push({
            label: `matches/${sub.name}`,
            dir: path.join('matches', sub.name),
            max: 25,
          });
        }
        continue;
      }
      const max = dir === 'repositories' ? 30 : 25;
      caps.push({ label: dir, dir, max });
    }
    for (const { label, dir, max } of caps) {
      const fileCount = countFilesRecursive(path.join(meProfileDir, dir));
      expect(fileCount).toBeLessThanOrEqual(max);
    }
  });

  it('keeps integration/ free of production service files', () => {
    const integrationDir = path.join(meProfileDir, 'integration');
    const services = fs
      .readdirSync(integrationDir)
      .filter((n) => n.endsWith('.service.ts'));
    expect(services).toEqual([]);
  });

  it('does not leave moved services at root', () => {
    const orphaned = [
      'me-matches.service.ts',
      'me-conversations.service.ts',
      'me-profile.service.ts',
      'match-quality-audit.ts',
      'me-profile-http.shared-harness.ts',
    ];
    for (const name of orphaned) {
      expect(fs.existsSync(path.join(meProfileDir, name))).toBe(false);
    }
  });

  it('points validate scripts at new paths', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(apiRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts['validate:new-model-e2e']).toContain(
      'me-profile/e2e/me-new-model-e2e.integration.spec.ts',
    );
    expect(pkg.scripts['validate:phase2-me-profile']).toContain(
      'me-profile/integration/me-profile-http-crud.integration.spec.ts',
    );
    expect(pkg.scripts['smoke:ws']).toContain(
      'me-profile/integration/me-conversation-messages-ws.integration.spec.ts',
    );
    expect(pkg.scripts['smoke:me-profile']).toContain('me-profile-http-');
  });

  it('has no stale root-level me-matches.service import paths in src', () => {
    const out = execSync(
      'git grep -l "me-profile/me-matches.service" -- src || exit 0',
      {
        cwd: apiRoot,
        encoding: 'utf8',
      },
    ).trim();
    expect(out).toBe('');
  });

  it('has no stale pre-move me-profile/ import paths in src', () => {
    const stalePatterns = [
      'me-profile/me-conversations.service',
      'me-profile/me-profile-analysis',
      'me-profile/match-quality-audit',
      'me-profile/me-profile.service',
      'me-profile/me-domain.error',
      'me-profile/me-profile-http.shared-harness',
    ];
    for (const pattern of stalePatterns) {
      const out = execSync(`git grep -l "${pattern}" -- src || exit 0`, {
        cwd: apiRoot,
        encoding: 'utf8',
      }).trim();
      expect(out).toBe('');
    }
  });

  it('keeps matches/ subfolders at expected paths', () => {
    for (const sub of ['core', 'list', 'rank', 'detail', 'actions', 'support']) {
      expect(fs.existsSync(path.join(meProfileDir, 'matches', sub))).toBe(true);
    }
    expect(
      fs.existsSync(path.join(meProfileDir, 'matches', 'core', 'me-matches.service.ts')),
    ).toBe(true);
  });
});
