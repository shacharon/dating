import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
p.$queryRawUnsafe<{ tablename: string }[]>(
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
)
  .then((rows) => rows.forEach((r) => console.log(r.tablename)))
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => p.$disconnect());
