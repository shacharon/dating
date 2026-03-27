/**
 * HTTP CRUD for UserProfile — Prisma only; separate from domain UserProfilesRepository.
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CreateUserProfileDto } from '../dto/create-user-profile.dto';
import type { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import type { UserProfileResponseDto } from '../dto/user-profile-response.dto';
import { PrismaService } from '../../prisma/prisma.service';

interface UserProfileDelegate {
  findUnique(args: { where: { id: string } }): Promise<PersistenceRow | null>;
  findMany(args: {
    orderBy?: Array<{ createdAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' }>;
  }): Promise<PersistenceRow[]>;
  create(args: { data: Record<string, unknown> }): Promise<PersistenceRow>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<PersistenceRow>;
  deleteMany(args: { where: { id: string } }): Promise<{ count: number }>;
}

interface PersistenceRow {
  id: string;
  name: string;
  aboutMe: string;
  aboutPartner: string | null;
  aboutRelationship: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserProfilesApiRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get table(): UserProfileDelegate {
    return (this.prisma as unknown as { userProfile: UserProfileDelegate })
      .userProfile;
  }

  async findAll(): Promise<UserProfileResponseDto[]> {
    const rows = await this.table.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async findById(id: string): Promise<UserProfileResponseDto | null> {
    const row = await this.table.findUnique({ where: { id } });
    return row ? this.toDto(row) : null;
  }

  async create(dto: CreateUserProfileDto): Promise<UserProfileResponseDto> {
    const row = await this.table.create({
      data: {
        id: randomUUID(),
        name: dto.name,
        aboutMe: dto.aboutMe,
        aboutPartner: dto.aboutPartner ?? null,
        aboutRelationship: dto.aboutRelationship ?? null,
      },
    });
    return this.toDto(row);
  }

  async update(
    id: string,
    dto: UpdateUserProfileDto,
  ): Promise<UserProfileResponseDto | null> {
    const existing = await this.table.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.aboutMe !== undefined) {
      data.aboutMe = dto.aboutMe;
    }
    if (dto.aboutPartner !== undefined) {
      data.aboutPartner = dto.aboutPartner;
    }
    if (dto.aboutRelationship !== undefined) {
      data.aboutRelationship = dto.aboutRelationship;
    }
    if (Object.keys(data).length === 0) {
      return this.toDto(existing);
    }
    const row = await this.table.update({ where: { id }, data });
    return this.toDto(row);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.table.deleteMany({ where: { id } });
    return result.count > 0;
  }

  private toDto(row: PersistenceRow): UserProfileResponseDto {
    return {
      id: row.id,
      name: row.name,
      aboutMe: row.aboutMe,
      aboutPartner: row.aboutPartner,
      aboutRelationship: row.aboutRelationship,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
