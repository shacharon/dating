import { Injectable } from '@nestjs/common';
import type { EvaluateBatchResult } from '../evaluate/evaluate.service';

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry {
  result: EvaluateBatchResult;
  expiresAt: number;
}

@Injectable()
export class AnalysisCacheService {
  private readonly store = new Map<string, CacheEntry>();

  buildKey(
    profileId: string,
    textHash: string,
    promptVersion: string,
    policyVersion: string,
  ): string {
    return `analysis:v1:${profileId}:${promptVersion}:${policyVersion}:${textHash}`;
  }

  get(key: string): EvaluateBatchResult | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.result;
  }

  set(key: string, result: EvaluateBatchResult, ttlMs: number = DEFAULT_TTL_MS): void {
    this.store.set(key, {
      result,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /** For tests / invalidation: clear all entries (optional key prefix). */
  clear(prefix?: string): void {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}
