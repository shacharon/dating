/**
 * Truncate all tables and print a row-count report before and after.
 * Run from dating-api root:  npx ts-node scripts/truncate-all-tables.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TABLES = [
  // children first, parents last
  "UserProfileEvaluation",
  "UserProfile",
  "UserSession",
  "User",
] as const;

async function countRows(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const result = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "${table}"`
    );
    counts[table] = Number(result[0].count);
  }
  return counts;
}

function printReport(label: string, counts: Record<string, number>) {
  console.log(`\n${"=".repeat(52)}`);
  console.log(` ${label}`);
  console.log("=".repeat(52));
  console.log(` ${"Table".padEnd(32)} ${"Rows".padStart(8)}`);
  console.log("-".repeat(52));
  for (const [table, count] of Object.entries(counts)) {
    console.log(` ${table.padEnd(32)} ${String(count).padStart(8)}`);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log("-".repeat(52));
  console.log(` ${"TOTAL".padEnd(32)} ${String(total).padStart(8)}`);
  console.log("=".repeat(52));
}

async function main() {
  console.log("Connecting to database...");
  await prisma.$connect();

  const before = await countRows();
  printReport("BEFORE TRUNCATE", before);

  const totalBefore = Object.values(before).reduce((a, b) => a + b, 0);
  if (totalBefore === 0) {
    console.log("\n✓ All tables are already empty. Nothing to truncate.");
    return;
  }

  console.log("\nRunning TRUNCATE...");
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "UserProfileEvaluation",
      "UserProfile",
      "UserSession",
      "User"
    RESTART IDENTITY CASCADE
  `);

  const after = await countRows();
  printReport("AFTER TRUNCATE", after);

  const allEmpty = Object.values(after).every((c) => c === 0);
  console.log(
    allEmpty
      ? "\n✅  All tables successfully cleared."
      : "\n❌  Some tables still have rows — check above."
  );
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
