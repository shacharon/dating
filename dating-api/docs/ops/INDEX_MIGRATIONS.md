# Index migrations (ops)

**Sprint 28 Story 3.** Hot-path indexes ship as a normal Prisma migration. On **large** production tables, prefer `CREATE INDEX CONCURRENTLY` (cannot run inside Prisma’s transactional migrate).

## Concurrent apply (large prod)

1. Run the three `CREATE INDEX CONCURRENTLY IF NOT EXISTS …` statements from the header comment in  
   `prisma/migrations/20260801120000_add_scale_hot_path_indexes/migration.sql`.
2. Mark the migration applied without re-running SQL:  
   `npx prisma migrate resolve --applied 20260801120000_add_scale_hot_path_indexes`
3. Confirm `prisma migrate status` is clean.

Small / empty / `dev` DBs: use `prisma migrate deploy` as usual.
