/** @vitest-environment node */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const uiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('post-cap-export.mjs', () => {
  let tempOutDir: string;

  afterEach(() => {
    if (tempOutDir && fs.existsSync(tempOutDir)) {
      fs.rmSync(tempOutDir, { recursive: true, force: true });
    }
  });

  it('copies out/index.html to out/404.html', () => {
    tempOutDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-export-'));
    const indexHtml = path.join(tempOutDir, 'index.html');
    fs.writeFileSync(indexHtml, '<html><body>app</body></html>', 'utf8');

    execSync('node scripts/post-cap-export.mjs', {
      cwd: uiRoot,
      stdio: 'pipe',
      env: { ...process.env, CAP_EXPORT_OUT_DIR: tempOutDir },
    });

    const notFoundHtml = path.join(tempOutDir, '404.html');
    expect(fs.readFileSync(notFoundHtml, 'utf8')).toBe(
      fs.readFileSync(indexHtml, 'utf8'),
    );
  });

  it('exits non-zero when index.html is missing', () => {
    tempOutDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-export-'));

    expect(() =>
      execSync('node scripts/post-cap-export.mjs', {
        cwd: uiRoot,
        stdio: 'pipe',
        env: { ...process.env, CAP_EXPORT_OUT_DIR: tempOutDir },
      }),
    ).toThrow();
  });
});
