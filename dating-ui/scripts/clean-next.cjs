/**
 * Deletes `.next` so Turbopack/webpack caches are rebuilt.
 * Stop `next dev` first — on Windows, open files will cause rm to fail.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const nextDir = path.join(root, ".next");

if (!fs.existsSync(nextDir)) {
  console.log("No .next directory to remove.");
  process.exit(0);
}

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next — run npm run dev again.");
} catch (e) {
  console.error(
    "Failed to remove .next (close Next dev server / IDE locks on that folder):",
    e instanceof Error ? e.message : e,
  );
  process.exit(1);
}
