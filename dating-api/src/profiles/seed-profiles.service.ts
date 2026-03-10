import { Injectable, Inject } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import type { UserProfilesRepository, UpsertUserParams } from '../domain/repositories/user-profiles.repository';
import { USER_PROFILES_REPOSITORY } from '../domain/repositories/user-profiles.repository';

/** One profile as in profiles.json (id optional, raw text fields). */
export interface ProfileSeedInput {
  id?: string;
  name: string;
  aboutMe: string;
  aboutPartner?: string;
  aboutRelationship?: string;
}

export interface SeedFromFileResult {
  inserted: number;
  ids: string[];
}

@Injectable()
export class SeedProfilesService {
  constructor(
    @Inject(USER_PROFILES_REPOSITORY)
    private readonly repo: UserProfilesRepository,
  ) {}

  /**
   * Read a JSON array from filePath and upsert each item into UserProfilesRepository.
   * Assigns id if missing. Saves only raw text fields: aboutMe, aboutPartner, aboutRelationship.
   */
  async seedFromFile(filePath: string): Promise<SeedFromFileResult> {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('profiles.json must be a JSON array');
    }

    const ids: string[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i] as unknown;
      const params = this.toUpsertParams(item, i);
      const record = await this.repo.upsertUser(params);
      ids.push(record.id);
    }

    return { inserted: ids.length, ids };
  }

  private toUpsertParams(item: unknown, index: number): UpsertUserParams {
    if (!item || typeof item !== 'object') {
      throw new Error(`Profile at index ${index}: expected object`);
    }
    const o = item as Record<string, unknown>;
    const name = o.name;
    const aboutMe = o.aboutMe;
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error(`Profile at index ${index}: missing or invalid name`);
    }
    if (typeof aboutMe !== 'string') {
      throw new Error(`Profile at index ${index}: aboutMe must be a string`);
    }

    const id = o.id != null ? String(o.id).trim() : undefined;
    const aboutPartner = o.aboutPartner != null ? String(o.aboutPartner) : '';
    const aboutRelationship = o.aboutRelationship != null ? String(o.aboutRelationship) : '';

    const params: UpsertUserParams = {
      name: name.trim(),
      aboutMe: aboutMe.trim(),
      aboutPartner: aboutPartner.trim(),
      aboutRelationship: aboutRelationship.trim(),
    };
    if (id !== undefined && id !== '') {
      params.id = id;
    }
    return params;
  }
}
