import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type DeviceTokenRow = { token: string; platform: string };

export interface IDeviceTokenRepository {
  upsert(userId: string, token: string, platform: string): Promise<void>;
  findByUserId(userId: string): Promise<DeviceTokenRow[]>;
  deleteForUser(userId: string, token: string): Promise<number>;
}

export const DEVICE_TOKEN_REPOSITORY = Symbol('DEVICE_TOKEN_REPOSITORY');

@Injectable()
export class PrismaDeviceTokenRepository implements IDeviceTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, token: string, platform: string): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
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
