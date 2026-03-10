/**
 * In-memory implementation of the MatchesRepository for POC usage.
 * Uses Map-based storage and simple deterministic listing.
 */

import type { UserId } from '../../../domain/users/user.types';
import type {
  MatchId,
  MatchRecord,
} from '../../../domain/matches/match.types';
import type { MatchesRepository } from '../../../domain/repositories/matches.repository';
import { nextMatchId, now } from './repo.utils';

type StoredMatch = MatchRecord;

export class InMemoryMatchesRepository implements MatchesRepository {
  private readonly matchesById = new Map<MatchId, StoredMatch>();

  async getById(id: MatchId): Promise<MatchRecord | null> {
    const stored = this.matchesById.get(id);
    return stored ? { ...stored } : null;
  }

  async listMatchesForUser(
    userId: UserId,
    limit?: number,
    offset?: number,
  ): Promise<MatchRecord[]> {
    const all = Array.from(this.matchesById.values()).filter(
      (m) =>
        m.pair.selfId === userId ||
        m.pair.partnerId === userId,
    );

    // Stable deterministic order by createdAt then id.
    all.sort((a, b) => {
      const at = a.createdAt?.getTime() ?? 0;
      const bt = b.createdAt?.getTime() ?? 0;
      if (at !== bt) return at - bt;
      return String(a.id).localeCompare(String(b.id));
    });

    const start = Math.max(0, offset ?? 0);
    const end = limit != null ? start + Math.max(0, limit) : undefined;
    return all.slice(start, end).map((m) => ({ ...m }));
  }

  async save(record: MatchRecord): Promise<MatchRecord> {
    const existing = record.id ? this.matchesById.get(record.id) : undefined;
    const isInsert = !existing;
    const id: MatchId = record.id ?? nextMatchId();

    const createdAt = isInsert
      ? record.createdAt ?? now()
      : existing?.createdAt ?? record.createdAt ?? now();

    const updatedAt =
      isInsert && record.updatedAt
        ? record.updatedAt
        : !isInsert
        ? record.updatedAt ?? now()
        : undefined;

    const stored: StoredMatch = {
      ...record,
      id,
      createdAt,
      updatedAt,
    };

    this.matchesById.set(id, stored);
    return { ...stored };
  }

  async delete(id: MatchId): Promise<boolean> {
    const existed = this.matchesById.delete(id);
    return existed;
  }
}

