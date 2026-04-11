import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  const identity = {
    googleId: 'gid',
    email: 'a@b.com',
    displayName: 'A',
    avatarUrl: null as string | null,
  };

  it('reuses user on repeated Google login via findByGoogleId + updateLoginFields', async () => {
    const existing = {
      id: 'user-1',
      email: 'old@b.com',
      googleId: 'gid',
      displayName: 'Old',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    };
    prisma.user.findUnique.mockResolvedValueOnce(existing);
    prisma.user.update.mockResolvedValue({
      ...existing,
      email: identity.email,
      displayName: identity.displayName,
      lastLoginAt: new Date('2030-01-01T00:00:00.000Z'),
    });

    const found = await service.findByGoogleId('gid');
    expect(found?.id).toBe('user-1');
    const updated = await service.updateLoginFields(found!.id, identity);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          email: 'a@b.com',
          displayName: 'A',
          lastLoginAt: expect.any(Date),
        }),
      }),
    );
    expect(updated.email).toBe('a@b.com');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('findById / findByEmail / findByGoogleId skip Prisma when trimmed empty', async () => {
    await expect(service.findById('   ')).resolves.toBeNull();
    await expect(service.findByEmail('')).resolves.toBeNull();
    await expect(service.findByGoogleId('')).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('findByGoogleId delegates to prisma with trimmed googleId', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u-g',
      email: 'g@h.com',
      googleId: 'gid-99',
      displayName: null,
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    });
    const row = await service.findByGoogleId('  gid-99  ');
    expect(row?.googleId).toBe('gid-99');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { googleId: 'gid-99' },
    });
  });

  it('findByEmail delegates to prisma with trimmed email', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'x@y.com',
      googleId: 'g-other',
      displayName: null,
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    });
    const row = await service.findByEmail('  x@y.com  ');
    expect(row?.id).toBe('u1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'x@y.com' },
    });
  });

  it('createFromGoogleIdentity inserts when no row for googleId', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'new',
      ...identity,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(),
    });

    const row = await service.createFromGoogleIdentity(identity);
    expect(row.id).toBe('new');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        googleId: 'gid',
        email: 'a@b.com',
        displayName: 'A',
        lastLoginAt: expect.any(Date),
      }),
    });
  });
});
