import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(scriptDir, '..');
const placeholderDir = path.join(uiRoot, 'capacitor-web-placeholder');
const outDir = path.join(uiRoot, 'out');
const sourceHtml = path.join(placeholderDir, 'index.html');
const destHtml = path.join(outDir, 'index.html');

if (!fs.existsSync(sourceHtml)) {
  console.error(`Missing placeholder: ${sourceHtml}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(sourceHtml, destHtml);
console.log(`Prepared Capacitor webDir: ${destHtml}`);
