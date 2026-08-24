import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type DeviceTokenRow = { token: string; platform: string };

export interface IDeviceTokenRepository {
  upsert(userId: string, token: string, platform: string): Promise<void>;
  findByUserId(userId: string): Promise<DeviceTokenRow[]>;
  deleteForUser(userId: string, token: string): Promise<number>;
}

export const DEVICE_TOKEN_REPOSITORY = Symbol('DEVICE_TOKEN_REPOSITORY');

/** Cap tokens per user to limit storage / FCM fan-out abuse (Sprint 67.1 security). */
export const MAX_DEVICE_TOKENS_PER_USER = 10;

@Injectable()
export class PrismaDeviceTokenRepository implements IDeviceTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, token: string, platform: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.deviceToken.upsert({
        where: { token },
        create: { userId, token, platform },
        update: { userId, platform },
      });

      const owned = await tx.deviceToken.findMany({
        where: { userId },
        orderBy: { updatedAt: 'asc' },
        select: { id: true },
      });
      const overflow = owned.length - MAX_DEVICE_TOKENS_PER_USER;
      if (overflow > 0) {
        const dropIds = owned.slice(0, overflow).map((row) => row.id);
        await tx.deviceToken.deleteMany({
          where: { id: { in: dropIds } },
        });
      }
    });
  }

  async findByUserId(userId: string): Promise<DeviceTokenRow[]> {
    return this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true, platform: true },
    });
  }

  async deleteForUser(userId: string, token: string): Promise<number> {
    const result = await this.prisma.deviceToken.deleteMany({
      where: { userId, token },
    });
    return result.count;
  }
}
