/** @vitest-environment node */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const uiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('prepare-cap-webdir.mjs', () => {
  const outHtml = path.join(uiRoot, 'out', 'index.html');
  const placeholderHtml = path.join(
    uiRoot,
    'capacitor-web-placeholder',
    'index.html',
  );

  afterEach(() => {
    if (fs.existsSync(outHtml)) {
      fs.unlinkSync(outHtml);
    }
  });

  it('copies committed placeholder HTML into out/index.html', () => {
    execSync('node scripts/prepare-cap-webdir.mjs', {
      cwd: uiRoot,
      stdio: 'pipe',
    });

    expect(fs.existsSync(outHtml)).toBe(true);
    expect(fs.readFileSync(outHtml, 'utf8')).toBe(
      fs.readFileSync(placeholderHtml, 'utf8'),
    );
    expect(fs.readFileSync(outHtml, 'utf8')).toContain(
      'Capacitor shell — Story 2 export pending.',
    );
  });

  it('is idempotent when run twice', () => {
    execSync('node scripts/prepare-cap-webdir.mjs', {
      cwd: uiRoot,
      stdio: 'pipe',
    });
    const first = fs.readFileSync(outHtml, 'utf8');

    execSync('node scripts/prepare-cap-webdir.mjs', {
      cwd: uiRoot,
      stdio: 'pipe',
    });

    expect(fs.readFileSync(outHtml, 'utf8')).toBe(first);
  });
});
