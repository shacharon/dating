/**
 * Tests for LLM-based interests extraction service.
 * Validates service orchestration, schema validation, normalization, and error handling.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { InterestsExtractionService } from './interests-extraction.service';
import { LLMRouterService } from '../llm/llm-router.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { RawInterests } from './extracted-interests.interface';

describe('InterestsExtractionService', () => {
  let service: InterestsExtractionService;
  let mockLlm: jest.Mocked<LLMRouterService>;
  let mockLogger: jest.Mocked<SimpleLogger>;

  beforeEach(async () => {
    mockLlm = {
      completeJSON: jest.fn(),
    } as unknown as jest.Mocked<LLMRouterService>;

    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<SimpleLogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterestsExtractionService,
        { provide: LLMRouterService, useValue: mockLlm },
        { provide: SimpleLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<InterestsExtractionService>(InterestsExtractionService);
  });

  describe('extractForDomain', () => {
    it('should return empty array for empty text', async () => {
      const result = await service.extractForDomain('self', '');
      expect(result).toEqual([]);
      expect(mockLlm.completeJSON).not.toHaveBeenCalled();
    });

    it('should call LLM with correct parameters', async () => {
      mockLlm.completeJSON.mockResolvedValue({
        value: { items: [] },
        rawText: '{"items":[]}',
        usage: {},
      });

      await service.extractForDomain('self', 'I love hiking');

      expect(mockLlm.completeJSON).toHaveBeenCalledWith(
        expect.objectContaining({
          modelKey: 'fast',
          purpose: 'interests-extraction',
          temperature: 0.1,
          maxTokens: 2000,
          timeoutMs: 60_000,
        }),
      );
    });

    it('should normalize and validate LLM output', async () => {
      mockLlm.completeJSON.mockResolvedValue({
        value: {
          items: [
            { tag: 'hiking', strength: 'explicit', evidence: 'I love hiking' },
            { tag: 'gym', strength: 'strong', evidence: 'at the gym 3x a week' },
          ],
        },
        rawText: '{}',
        usage: {},
      });

      const result = await service.extractForDomain('self', 'I love hiking and go to the gym 3x a week');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        tag: 'gym',
        strength: 'strong',
        evidence: 'at the gym 3x a week',
        ruleId: 'llm_v1',
      });
      expect(result[1]).toEqual({
        tag: 'hiking',
        strength: 'explicit',
        evidence: 'I love hiking',
        ruleId: 'llm_v1',
      });
    });

    it('should preserve non-canonical tags from the model', async () => {
      mockLlm.completeJSON.mockResolvedValue({
        value: {
          items: [
            { tag: 'hiking', strength: 'explicit', evidence: 'I love hiking' },
            { tag: 'unknown_tag', strength: 'explicit', evidence: 'unknown' },
            { tag: 'invalid', strength: 'explicit', evidence: 'invalid' },
          ],
        },
        rawText: '{}',
        usage: {},
      });

      const result = await service.extractForDomain('self', 'test text');

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.tag).sort()).toEqual(['hiking', 'invalid', 'unknown_tag']);
    });

    it('should truncate evidence to 60 chars', async () => {
      const longEvidence = 'This is a very long evidence string that exceeds sixty characters and should be truncated';
      mockLlm.completeJSON.mockResolvedValue({
        value: {
          items: [
            { tag: 'hiking', strength: 'explicit', evidence: longEvidence },
          ],
        },
        rawText: '{}',
        usage: {},
      });

      const result = await service.extractForDomain('self', 'test text');

      expect(result[0].evidence).toHaveLength(60);
      expect(result[0].evidence).toBe(longEvidence.slice(0, 60));
    });

    it('should set default ruleId if missing', async () => {
      mockLlm.completeJSON.mockResolvedValue({
        value: {
          items: [
            { tag: 'hiking', strength: 'explicit', evidence: 'test' },
          ],
        },
        rawText: '{}',
        usage: {},
      });

      const result = await service.extractForDomain('self', 'test text');

      expect(result[0].ruleId).toBe('llm_v1');
    });

    it('should handle LLM errors gracefully', async () => {
      mockLlm.completeJSON.mockRejectedValue(new Error('LLM timeout'));

      const result = await service.extractForDomain('self', 'test text');

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('interests_extraction_failed'),
        InterestsExtractionService.name,
      );
    });

    it('should normalize strength to explicit if invalid', async () => {
      mockLlm.completeJSON.mockResolvedValue({
        value: {
          items: [
            { tag: 'hiking', strength: 'invalid_strength' as any, evidence: 'test' },
          ],
        },
        rawText: '{}',
        usage: {},
      });

      const result = await service.extractForDomain('self', 'test text');

      expect(result[0].strength).toBe('explicit');
    });

    it('should sort results by tag alphabetically', async () => {
      mockLlm.completeJSON.mockResolvedValue({
        value: {
          items: [
            { tag: 'yoga', strength: 'explicit', evidence: 'yoga' },
            { tag: 'hiking', strength: 'explicit', evidence: 'hiking' },
            { tag: 'books', strength: 'explicit', evidence: 'books' },
          ],
        },
        rawText: '{}',
        usage: {},
      });

      const result = await service.extractForDomain('self', 'test text');

      expect(result.map(r => r.tag)).toEqual(['books', 'hiking', 'yoga']);
    });
  });

  describe('extractFromProfile', () => {
    it('should extract from all three domains in parallel', async () => {
      mockLlm.completeJSON.mockResolvedValue({
        value: { items: [] },
        rawText: '{}',
        usage: {},
      });

      const texts = {
        aboutMe: 'I love hiking',
        aboutPartner: 'Someone who loves cooking',
        aboutRelationship: 'We can travel together',
      };

      await service.extractFromProfile(texts);

      expect(mockLlm.completeJSON).toHaveBeenCalledTimes(3);
    });

    it('should return RawInterests with correct structure', async () => {
      mockLlm.completeJSON
        .mockResolvedValueOnce({
          value: {
            items: [{ tag: 'hiking', strength: 'explicit', evidence: 'hiking' }],
          },
          rawText: '{}',
          usage: {},
        })
        .mockResolvedValueOnce({
          value: {
            items: [{ tag: 'cooking', strength: 'explicit', evidence: 'cooking' }],
          },
          rawText: '{}',
          usage: {},
        })
        .mockResolvedValueOnce({
          value: {
            items: [{ tag: 'travel', strength: 'explicit', evidence: 'travel' }],
          },
          rawText: '{}',
          usage: {},
        });

      const texts = {
        aboutMe: 'I love hiking',
        aboutPartner: 'Someone who loves cooking',
        aboutRelationship: 'We can travel together',
      };

      const result: RawInterests = await service.extractFromProfile(texts);

      expect(result.version).toBe('v1');
      expect(result.self).toHaveLength(1);
      expect(result.self[0].tag).toBe('hiking');
      expect(result.partner).toHaveLength(1);
      expect(result.partner[0].tag).toBe('cooking');
      expect(result.relationship).toHaveLength(1);
      expect(result.relationship[0].tag).toBe('travel');
    });

    it('should handle empty texts gracefully', async () => {
      const texts = {
        aboutMe: '',
        aboutPartner: '',
        aboutRelationship: '',
      };

      const result = await service.extractFromProfile(texts);

      expect(result.version).toBe('v1');
      expect(result.self).toEqual([]);
      expect(result.partner).toEqual([]);
      expect(result.relationship).toEqual([]);
      expect(mockLlm.completeJSON).not.toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      mockLlm.completeJSON
        .mockResolvedValueOnce({
          value: {
            items: [{ tag: 'hiking', strength: 'explicit', evidence: 'hiking' }],
          },
          rawText: '{}',
          usage: {},
        })
        .mockRejectedValueOnce(new Error('LLM error'))
        .mockResolvedValueOnce({
          value: {
            items: [{ tag: 'travel', strength: 'explicit', evidence: 'travel' }],
          },
          rawText: '{}',
          usage: {},
        });

      const texts = {
        aboutMe: 'I love hiking',
        aboutPartner: 'Someone who loves cooking',
        aboutRelationship: 'We can travel together',
      };

      const result = await service.extractFromProfile(texts);

      expect(result.self).toHaveLength(1);
      expect(result.partner).toEqual([]);
      expect(result.relationship).toHaveLength(1);
    });
  });

  describe('schema validation', () => {
    it('should handle invalid LLM payload with missing items gracefully', async () => {
      mockLlm.completeJSON.mockRejectedValue(new Error('Schema validation failed'));

      const result = await service.extractForDomain('self', 'test');

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('interests_extraction_failed'),
        InterestsExtractionService.name,
      );
    });

    it('should handle malformed items array gracefully', async () => {
      mockLlm.completeJSON.mockRejectedValue(new Error('Invalid schema'));

      const result = await service.extractForDomain('self', 'test');

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('interests_extraction_failed'),
        InterestsExtractionService.name,
      );
    });
  });
});
