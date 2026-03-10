import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SimpleLogger } from '../logger/simple-logger.service';
import {
  ProfilesJsonService,
  sanitizeIdForFilename,
} from './profiles-json.service';

function minimalProfilePayload(
  id: string,
  name: string,
  savedAt: string,
): Record<string, unknown> {
  return {
    id,
    name,
    texts: { aboutMe: 'a', aboutPartner: 'b', aboutRelationship: 'c' },
    evaluation: {
      self: { domain: 'self', signals: {}, evidence: [], version: 'v1', confidence: 0.5 },
      partner: { domain: 'partner', signals: {}, evidence: [], version: 'v1', confidence: 0.5 },
      relationship: {
        domain: 'relationship',
        signals: {},
        evidence: [],
        version: 'v1',
        confidence: 0.5,
      },
      compatibility: { selfVsPartner: { overallScore: 50 }, selfVsRelationship: { overallScore: 50 } },
      display: { summary: 's', insight: 'i' },
      productScores: {
        partnerFitScore: 50,
        relationshipFitScore: 50,
        coverageScore: 50,
        frictionRiskScore: 0,
        overallDecisionScore: 50,
        policyVersion: 'product-score-v1',
      },
      flags: [],
    },
    savedAt,
  };
}

describe('ProfilesJsonService', () => {
  let service: ProfilesJsonService;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'profiles-json-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), verbose: jest.fn() } as unknown as SimpleLogger;
    const mockConfig = { get: jest.fn(() => undefined) } as unknown as ConfigService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: SimpleLogger, useValue: mockLogger },
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: ProfilesJsonService,
          useFactory: (logger: SimpleLogger, config: ConfigService) =>
            new ProfilesJsonService(logger, config, tempDir),
          inject: [SimpleLogger, ConfigService],
        },
      ],
    }).compile();

    service = module.get<ProfilesJsonService>(ProfilesJsonService);
    const entries = await readdir(tempDir);
    for (const f of entries) {
      await rm(join(tempDir, f), { force: true });
    }
  });

  describe('sanitizeIdForFilename', () => {
    it('allows [a-zA-Z0-9_-] and replaces other chars with _', () => {
      expect(sanitizeIdForFilename('abc-123_XYZ')).toBe('abc-123_XYZ');
      expect(sanitizeIdForFilename('a/b/c')).toBe('a_b_c');
      expect(sanitizeIdForFilename('..')).toBe('__');
    });
  });

  describe('list', () => {
    it('returns empty array when directory does not exist', async () => {
      const nonExistentDir = join(tmpdir(), 'profiles-nonexistent-' + Date.now());
      const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), verbose: jest.fn() } as unknown as SimpleLogger;
      const mockConfig = { get: jest.fn(() => undefined) } as unknown as ConfigService;
      const svc = new ProfilesJsonService(mockLogger, mockConfig, nonExistentDir);
      const items = await svc.list();
      expect(items).toEqual([]);
    });

    it('returns items from valid JSON files sorted by savedAt desc', async () => {
      const older = minimalProfilePayload('id1', 'Alice', '2025-01-01T10:00:00.000Z');
      const newer = minimalProfilePayload('id2', 'Bob', '2025-01-02T10:00:00.000Z');
      await writeFile(join(tempDir, 'id1.json'), JSON.stringify(older), 'utf8');
      await writeFile(join(tempDir, 'id2.json'), JSON.stringify(newer), 'utf8');

      const items = await service.list();

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ id: 'id2', name: 'Bob', savedAt: '2025-01-02T10:00:00.000Z' });
      expect(items[1]).toEqual({ id: 'id1', name: 'Alice', savedAt: '2025-01-01T10:00:00.000Z' });
    });

    it('skips invalid JSON and does not throw', async () => {
      await writeFile(join(tempDir, 'valid.json'), JSON.stringify(minimalProfilePayload('v', 'Valid', '2025-01-01T00:00:00.000Z')), 'utf8');
      await writeFile(join(tempDir, 'invalid.json'), 'not json', 'utf8');

      const items = await service.list();

      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Valid');
    });

    it('ignores .json.tmp files', async () => {
      await writeFile(join(tempDir, 'a.json.tmp'), '{}', 'utf8');
      await writeFile(join(tempDir, 'b.json'), JSON.stringify(minimalProfilePayload('b', 'B', '2025-01-01T00:00:00.000Z')), 'utf8');

      const items = await service.list();

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('b');
    });
  });

  describe('getById', () => {
    it('returns full profile when file exists', async () => {
      const payload = minimalProfilePayload('test-id', 'shachar', '2025-03-03T12:00:00.000Z');
      await writeFile(join(tempDir, 'test-id.json'), JSON.stringify(payload), 'utf8');

      const profile = await service.getById('test-id');

      expect(profile).not.toBeNull();
      expect(profile?.id).toBe('test-id');
      expect(profile?.name).toBe('shachar');
      expect(profile?.texts.aboutMe).toBe('a');
      expect(profile?.savedAt).toBe('2025-03-03T12:00:00.000Z');
    });

    it('uses sanitized id for filename', async () => {
      const payload = minimalProfilePayload('abc-123', 'User', '2025-01-01T00:00:00.000Z');
      await writeFile(join(tempDir, 'abc-123.json'), JSON.stringify(payload), 'utf8');

      const profile = await service.getById('abc-123');
      expect(profile?.name).toBe('User');

      // abc/123 sanitizes to abc_123; write a file matching that sanitized name
      const payloadSanitized = minimalProfilePayload('abc_123', 'User', '2025-01-01T00:00:00.000Z');
      await writeFile(join(tempDir, 'abc_123.json'), JSON.stringify(payloadSanitized), 'utf8');

      const profileWithSpecial = await service.getById('abc/123');
      expect(profileWithSpecial?.name).toBe('User');
    });

    it('returns null when file does not exist', async () => {
      const profile = await service.getById('nonexistent-id');
      expect(profile).toBeNull();
    });

    it('returns null for path traversal attempt (sanitized filename does not exist)', async () => {
      const profile = await service.getById('../../../etc/passwd');
      expect(profile).toBeNull();
    });

    it('returns null when id is empty (sanitizes to empty)', async () => {
      const profile = await service.getById('');
      expect(profile).toBeNull();
    });
  });
});
