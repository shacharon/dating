import { Prisma } from '@prisma/client';
import {
  databaseUrlHasConnectionLimit,
  maybeRecordPrismaPoolTimeout,
} from './prisma-pool.helpers';
import * as customMetrics from '../observability/custom-metrics';

describe('prisma-pool.helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('databaseUrlHasConnectionLimit', () => {
    it('detects connection_limit query param', () => {
      expect(
        databaseUrlHasConnectionLimit(
          'postgresql://u:p@localhost:5432/db?schema=public&connection_limit=10&pool_timeout=10',
        ),
      ).toBe(true);
      expect(
        databaseUrlHasConnectionLimit(
          'postgresql://u:p@localhost:5432/db?schema=public&sslmode=require',
        ),
      ).toBe(false);
    });
  });

  describe('maybeRecordPrismaPoolTimeout', () => {
    it('records metric for P2024', () => {
      const spy = jest.spyOn(customMetrics, 'recordPrismaPoolTimeout');
      const err = new Prisma.PrismaClientKnownRequestError('pool', {
        code: 'P2024',
        clientVersion: 'test',
      });
      expect(maybeRecordPrismaPoolTimeout(err)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('ignores other Prisma codes and non-Prisma errors', () => {
      const spy = jest.spyOn(customMetrics, 'recordPrismaPoolTimeout');
      const other = new Prisma.PrismaClientKnownRequestError('x', {
        code: 'P2002',
        clientVersion: 'test',
      });
      expect(maybeRecordPrismaPoolTimeout(other)).toBe(false);
      expect(maybeRecordPrismaPoolTimeout(new Error('nope'))).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
