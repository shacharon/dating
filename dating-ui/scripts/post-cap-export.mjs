import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(scriptDir, '..');
const outDir = process.env.CAP_EXPORT_OUT_DIR?.trim()
  ? path.resolve(process.env.CAP_EXPORT_OUT_DIR.trim())
  : path.join(uiRoot, 'out');
const indexHtml = path.join(outDir, 'index.html');
const notFoundHtml = path.join(outDir, '404.html');

if (!fs.existsSync(indexHtml)) {
  console.error(
    `Missing export output: ${indexHtml}. Run npm run build:capacitor first.`,
  );
  process.exit(1);
}

fs.copyFileSync(indexHtml, notFoundHtml);
console.log(`Capacitor SPA fallback: ${notFoundHtml}`);
