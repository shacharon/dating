/**
 * Prisma-backed UserProfilesRepository. Maps persistence rows to domain records only.
 */

import { Injectable } from '@nestjs/common';
import type { UserId, UserProfileRecord } from '../../domain/users/user.types';
import type {
  UpsertUserParams,
  UserProfilesRepository,
} from '../../domain/repositories/user-profiles.repository';
import { PrismaService } from '../../prisma/prisma.service';
import {
  normalizeName,
  now,
} from '../../infrastructure/repositories/in-memory/repo.utils';

/** Narrow delegate so ESLint accepts calls while generated `PrismaClient` is loose-typed. */
interface UserProfileTableDelegate {
  findUnique(args: { where: { id: string } }): Promise<unknown>;
  findMany(args: {
    orderBy?: Array<{ createdAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' }>;
    skip?: number;
    take?: number;
    select?: { id: boolean; name: boolean };
  }): Promise<unknown>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<unknown>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  deleteMany(args: { where: { id: string } }): Promise<unknown>;
}

/** Mirrors the Prisma `UserProfile` model; kept local so domain stays Prisma-free. */
interface UserProfilePersistenceRow {
  id: string;
  name: string;
  aboutMe: string;
  aboutPartner: string | null;
  aboutRelationship: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

@Injectable()
export class PrismaUserProfilesRepository implements UserProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get userProfileTable(): UserProfileTableDelegate {
    return (this.prisma as unknown as { userProfile: UserProfileTableDelegate })
      .userProfile;
  }

  async getById(id: UserId): Promise<UserProfileRecord | null> {
    const row = (await this.userProfileTable.findUnique({
      where: { id },
    })) as UserProfilePersistenceRow | null;
    return row ? this.toRecord(row) : null;
  }

  async list(limit?: number, offset?: number): Promise<UserProfileRecord[]> {
    const rows = (await this.userProfileTable.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: Math.max(0, offset ?? 0),
      take: limit != null ? Math.max(0, limit) : undefined,
    })) as UserProfilePersistenceRow[];
    return rows.map((row) => this.toRecord(row));
  }

  async upsertUser(params: UpsertUserParams): Promise<UserProfileRecord> {
    const normalized = normalizeName(params.name);
    const nameHit = await this.findByNormalizedName(normalized);

    let existing: UserProfilePersistenceRow | null = null;

    if (nameHit != null) {
      if (params.id && params.id !== nameHit.id) {
        throw new Error('User name already exists for a different id');
      }
      const row = (await this.userProfileTable.findUnique({
        where: { id: nameHit.id },
      })) as UserProfilePersistenceRow | null;
      existing = row;
    } else if (params.id) {
      const row = (await this.userProfileTable.findUnique({
        where: { id: params.id },
      })) as UserProfilePersistenceRow | null;
      existing = row;
    }

    const isInsert = existing == null;

    const createdAt =
      existing == null
        ? (params.createdAt ?? now())
        : (existing.createdAt ?? params.createdAt ?? now());

    const updatedAt =
      isInsert && params.updatedAt
        ? params.updatedAt
        : !isInsert
          ? (params.updatedAt ?? now())
          : undefined;

    const data = {
      name: params.name,
      aboutMe: params.aboutMe,
      aboutPartner: params.aboutPartner ?? null,
      aboutRelationship: params.aboutRelationship ?? null,
      createdAt,
      updatedAt: updatedAt ?? null,
    };

    let saved: UserProfilePersistenceRow;
    if (existing != null) {
      const row = (await this.userProfileTable.update({
        where: { id: existing.id },
        data,
      })) as UserProfilePersistenceRow;
      saved = row;
    } else {
      const row = (await this.userProfileTable.create({
        data: params.id != null ? { id: params.id, ...data } : { ...data },
      })) as UserProfilePersistenceRow;
      saved = row;
    }

    return this.toRecord(saved);
  }

  async delete(id: UserId): Promise<boolean> {
    const result = (await this.userProfileTable.deleteMany({
      where: { id },
    })) as { count: number };
    return result.count > 0;
  }

  private toRecord(row: UserProfilePersistenceRow): UserProfileRecord {
    return {
      id: row.id,
      aboutMe: row.aboutMe ?? '',
      aboutPartner: row.aboutPartner != null ? row.aboutPartner : undefined,
      aboutRelationship:
        row.aboutRelationship != null ? row.aboutRelationship : undefined,
      createdAt: row.createdAt != null ? row.createdAt : undefined,
      updatedAt: row.updatedAt != null ? row.updatedAt : undefined,
    };
  }

  /**
   * Matches in-memory name uniqueness (case-insensitive, trim). Loads id+name only.
   * Assumes modest profile counts; replace with DB constraint / expression index if needed.
   */
  private async findByNormalizedName(
    normalized: string,
  ): Promise<{ id: string } | null> {
    const rows = (await this.userProfileTable.findMany({
      select: { id: true, name: true },
    })) as Array<{ id: string; name: string }>;
    const hit = rows.find((r) => normalizeName(r.name) === normalized);
    return hit ? { id: hit.id } : null;
  }
}
