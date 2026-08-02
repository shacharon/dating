import { Prisma } from '@prisma/client';
import { recordPrismaPoolTimeout } from '../observability/custom-metrics';

/** True when DATABASE_URL query string includes `connection_limit=` (Prisma param name). */
export function databaseUrlHasConnectionLimit(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.has('connection_limit');
  } catch {
    // Non-URL or exotic schemes — fall back to substring (Prisma accepts postgres://).
    return /[?&]connection_limit=/.test(url);
  }
}

/**
 * If err is Prisma P2024 (pool acquire timeout), emit metric and return true.
 */
export function maybeRecordPrismaPoolTimeout(err: unknown): boolean {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2024'
  ) {
    recordPrismaPoolTimeout();
    return true;
  }
  return false;
}
