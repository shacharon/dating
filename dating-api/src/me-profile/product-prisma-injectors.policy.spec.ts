import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 64 Story 03 — product-path services must not inject PrismaService directly.
 */
describe('product Prisma injectors policy (sprint-64 story 03)', () => {
  const srcRoot = path.join(__dirname, '..');

  const productServiceRoots = [
    path.join(srcRoot, 'me-profile'),
    path.join(srcRoot, 'messaging-realtime'),
    path.join(srcRoot, 'matches', 'match-narrative'),
  ];

  const collectServiceFiles = (dir: string): string[] => {
    const out: string[] = [];
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules' || name === 'repositories') continue;
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        out.push(...collectServiceFiles(full));
        continue;
      }
      if (name.endsWith('.service.ts')) out.push(full);
    }
    return out;
  };

  it('product service modules have no direct PrismaService constructor injection', () => {
    const hits: string[] = [];
    for (const root of productServiceRoots) {
      for (const file of collectServiceFiles(root)) {
        const rel = path.relative(srcRoot, file).replace(/\\/g, '/');
        const text = fs.readFileSync(file, 'utf8');
        if (
          /constructor\s*\([^)]*PrismaService/.test(text) ||
          /private readonly prisma: PrismaService/.test(text)
        ) {
          hits.push(rel);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
