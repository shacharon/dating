import { Prisma } from '@prisma/client';
import { isPrismaUniqueConstraintViolation } from './prisma-auth.errors';

describe('isPrismaUniqueConstraintViolation', () => {
  it('returns true for P2002', () => {
    const err = new Prisma.PrismaClientKnownRequestError('x', {
      code: 'P2002',
      clientVersion: 't',
    });
    expect(isPrismaUniqueConstraintViolation(err)).toBe(true);
  });

  it('returns false for other codes', () => {
    const err = new Prisma.PrismaClientKnownRequestError('x', {
      code: 'P2025',
      clientVersion: 't',
    });
    expect(isPrismaUniqueConstraintViolation(err)).toBe(false);
  });

  it('returns false for non-Prisma errors', () => {
    expect(isPrismaUniqueConstraintViolation(new Error('x'))).toBe(false);
  });
});
