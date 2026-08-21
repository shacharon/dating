import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 63 Story 1 — enrichment facade + Redis export + batch shim hygiene.
 */
describe('enrichment merge hygiene wiring (sprint-63 story 1)', () => {
  const srcRoot = path.join(__dirname, '..');
  const evaluateDir = path.join(srcRoot, 'evaluate');
  const meProfileDir = path.join(srcRoot, 'me-profile');

  it('enrichment-v2 is a thin facade that only composes via the keyword manifest', () => {
    const facade = fs.readFileSync(
      path.join(evaluateDir, 'enrichment-v2.ts'),
      'utf8',
    );
    const lines = facade.split(/\r?\n/).length;
    expect(lines).toBeLessThanOrEqual(200);
    expect(facade).toContain("from './enrichment-keyword-manifest'");
    expect(facade).toContain('mapEnrichmentMappedSignals');
    expect(facade).toContain('joinBlocks');
    expect(facade).not.toMatch(/from ['\"]\.\/enrichment-(interest|rhythm|conflict)-keywords['\"]/);
    expect(facade).not.toMatch(/\bRegExp\b|\/\\b/);
  });

  it('keyword domain modules and manifest exist; v3/v4 alias files stay gone', () => {
    for (const name of [
      'enrichment-keyword-manifest.ts',
      'enrichment-keyword-helpers.ts',
      'enrichment-interest-keywords.ts',
      'enrichment-rhythm-keywords.ts',
      'enrichment-conflict-keywords.ts',
    ]) {
      expect(fs.existsSync(path.join(evaluateDir, name))).toBe(true);
    }
    expect(fs.existsSync(path.join(evaluateDir, 'enrichment-v3.ts'))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(evaluateDir, 'enrichment-v4.ts'))).toBe(
      false,
    );
  });

  it('RedisCacheModule exports port tokens only (not RedisCacheService class)', () => {
    const src = fs.readFileSync(
      path.join(srcRoot, 'cache', 'redis-cache.module.ts'),
      'utf8',
    );
    expect(src).toContain('useExisting: RedisCacheService');
    expect(src).toMatch(/exports:\s*\[[\s\S]*REDIS_CLIENT/);
    expect(src).toMatch(/exports:\s*\[[\s\S]*CACHE_KV/);
    expect(src).toMatch(/exports:\s*\[[\s\S]*CACHE_SETS/);
    expect(src).toMatch(/exports:\s*\[[\s\S]*CRON_LOCK/);
    const exportsBlock = src.match(/exports:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
    expect(exportsBlock).not.toContain('RedisCacheService');
  });

  it('conversation batch re-export shims are deleted; adapter owns helpers', () => {
    expect(
      fs.existsSync(
        path.join(meProfileDir, 'me-conversations-unread-batch.ts'),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(meProfileDir, 'me-conversations-last-message-batch.ts'),
      ),
    ).toBe(false);
    const adapter = fs.readFileSync(
      path.join(
        meProfileDir,
        'repositories',
        'prisma-conversation.repository.ts',
      ),
      'utf8',
    );
    expect(adapter).toContain(
      'export async function batchUnreadCountsByConversationId',
    );
    expect(adapter).toContain(
      'export async function batchLastMessagesByConversationId',
    );
  });

  it('no product *.service.ts outside cache/ imports RedisCacheService', () => {
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name === 'node_modules' || ent.name === 'dist') continue;
          out.push(...walk(p));
        } else if (ent.name.endsWith('.service.ts')) {
          out.push(p);
        }
      }
      return out;
    };
    const offenders = walk(srcRoot).filter((p) => {
      if (p.includes(`${path.sep}cache${path.sep}`)) return false;
      const src = fs.readFileSync(p, 'utf8');
      return (
        src.includes('RedisCacheService') ||
        /from ['"].*redis-cache\.service['"]/.test(src)
      );
    });
    expect(offenders).toEqual([]);
  });
});
