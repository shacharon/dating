import { ExtractionService } from './extraction.service';
import {
  createExtractionServiceTestContext,
  mockBehaviorLockResponse,
  mockExtractionResponse,
} from './extraction.service.spec-support';

describe('ExtractionService expansion shadow (signal3-04)', () => {
  let service: ExtractionService;
  let llmCompleteJSON: jest.Mock;

  const mockResponse = mockBehaviorLockResponse;

  beforeEach(async () => {
    ({ service, llmCompleteJSON } = await createExtractionServiceTestContext());
  });

  describe('SIGNAL3 shadow signals', () => {
    it('should extract conflictStyle when conflict handling cues are present', async () => {
      const text = 'I prefer to talk things through when we disagree. No drama, just calm discussion.';
      llmCompleteJSON.mockResolvedValue(
        mockResponse('self', {
          conflictStyle: 5,
          directness: 7,
        }, [
          { signal: 'conflictStyle', quote: 'talk things through when we disagree' },
          { signal: 'directness', quote: 'calm discussion' },
        ]),
      );

      const result = await service.extract('self', text);

      expect(result.signals['conflictStyle']).toBe(5);
      expect(result.evidence.some(e => e.signal === 'conflictStyle')).toBe(true);
    });

    it('should extract noveltyVsRoutine when spontaneity/routine cues are present', async () => {
      const text = 'I love spontaneity and trying new things. Always up for an adventure.';
      llmCompleteJSON.mockResolvedValue(
        mockResponse('self', {
          noveltyVsRoutine: 9,
          lifestylePace: 7,
        }, [
          { signal: 'noveltyVsRoutine', quote: 'love spontaneity and trying new things' },
          { signal: 'lifestylePace', quote: 'up for an adventure' },
        ]),
      );

      const result = await service.extract('self', text);

      // Expansion-06 Story 1: noveltyVsRoutine aliases → adventureNovelty
      expect(result.signals['adventureNovelty']).toBe(9);
      expect(result.evidence.some(e => e.signal === 'adventureNovelty')).toBe(true);
    });

    it('should extract structureChaosTolerance when order/organization cues are present', async () => {
      const text = 'I need order and structure in my life. Clean home matters to me.';
      llmCompleteJSON.mockResolvedValue(
        mockResponse('self', {
          structureChaosTolerance: 2,
          ambition: 6,
        }, [
          { signal: 'structureChaosTolerance', quote: 'need order and structure' },
          { signal: 'ambition', quote: 'matters to me' },
        ]),
      );

      const result = await service.extract('self', text);

      expect(result.signals['structureChaosTolerance']).toBe(2);
      expect(result.evidence.some(e => e.signal === 'structureChaosTolerance')).toBe(true);
    });

    it('should extract all three SIGNAL3 shadow signals when cues are present', async () => {
      const text = 'I prefer calm discussions when we disagree. I love spontaneous plans and trying new restaurants. I am organized but flexible.';
      llmCompleteJSON.mockResolvedValue(
        mockResponse('self', {
          conflictStyle: 5,
          noveltyVsRoutine: 8,
          structureChaosTolerance: 6,
          directness: 7,
        }, [
          { signal: 'conflictStyle', quote: 'calm discussions when we disagree' },
          { signal: 'noveltyVsRoutine', quote: 'spontaneous plans and trying new restaurants' },
          { signal: 'structureChaosTolerance', quote: 'organized but flexible' },
          { signal: 'directness', quote: 'calm discussions' },
        ]),
      );

      const result = await service.extract('self', text);

      expect(result.signals['conflictStyle']).toBe(5);
      expect(result.signals['adventureNovelty']).toBe(8);
      expect(result.signals['structureChaosTolerance']).toBe(6);
      expect(result.evidence.filter(e => ['conflictStyle', 'adventureNovelty', 'structureChaosTolerance'].includes(e.signal)).length).toBe(3);
    });

    it('should return null for SIGNAL3 signals when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockResponse('self', {
          ambition: 8,
          conflictStyle: null,
          noveltyVsRoutine: null,
          structureChaosTolerance: null,
        }, [
          { signal: 'ambition', quote: 'ambitious and driven' },
        ]),
      );

      const result = await service.extract('self', text);

      expect(result.signals['conflictStyle']).toBeNull();
      expect(result.signals['adventureNovelty']).toBeNull();
      expect(result.signals['structureChaosTolerance']).toBeNull();
    });
  });

  describe('Expansion-01 shadow signals', () => {
    it('extracts high empathyCompassion when LLM returns attuned score', async () => {
      const text =
        "Understanding how my partner feels is the foundation for me. I notice when they need space vs comfort.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { empathyCompassion: 8, emotionalDepth: 6 },
          [
            {
              signal: 'empathyCompassion',
              quote: 'Understanding how my partner feels is the foundation for me',
            },
            { signal: 'emotionalDepth', quote: 'foundation for me' },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['empathyCompassion']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'empathyCompassion')).toBe(true);
    });

    it('extracts low empathyCompassion when LLM returns logic-focused score', async () => {
      const text =
        "I approach relationships logically and don't analyze emotions much.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { empathyCompassion: 2 },
          [
            {
              signal: 'empathyCompassion',
              quote: "don't analyze emotions much",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['empathyCompassion']).toBe(2);
    });

    it('extracts high vulnerabilityOpenness when LLM returns open score', async () => {
      const text =
        'I share my fears and struggles with partners I trust deeply.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { vulnerabilityOpenness: 8, emotionalDepth: 7 },
          [
            {
              signal: 'vulnerabilityOpenness',
              quote: 'share my fears and struggles with partners I trust deeply',
            },
            { signal: 'emotionalDepth', quote: 'trust deeply' },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['vulnerabilityOpenness']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'vulnerabilityOpenness')).toBe(true);
    });

    it('extracts low vulnerabilityOpenness when LLM returns guarded score', async () => {
      const text =
        'I keep my personal struggles private and handle things myself.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { vulnerabilityOpenness: 2 },
          [
            {
              signal: 'vulnerabilityOpenness',
              quote: 'keep my personal struggles private',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['vulnerabilityOpenness']).toBe(2);
    });

    it('returns null for Expansion-01 signals when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            empathyCompassion: null,
            vulnerabilityOpenness: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['empathyCompassion']).toBeNull();
      expect(result.signals['vulnerabilityOpenness']).toBeNull();
    });

    it('strips out-of-range empathyCompassion to null via validateAndClean', async () => {
      const text = 'I care deeply about how my partner feels emotionally.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { empathyCompassion: 11 },
          [
            {
              signal: 'empathyCompassion',
              quote: 'care deeply about how my partner feels emotionally',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['empathyCompassion']).toBeNull();
    });
  });

  describe('Expansion-02 shadow signals', () => {
    it('extracts high emotionalRegulation when LLM returns steady score', async () => {
      const text =
        'I stay calm under pressure and take time to process before reacting when stressed.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { emotionalRegulation: 8, conflictStyle: 7 },
          [
            {
              signal: 'emotionalRegulation',
              quote: 'stay calm under pressure and take time to process before reacting',
            },
            { signal: 'conflictStyle', quote: 'before reacting when stressed' },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalRegulation']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'emotionalRegulation')).toBe(true);
    });

    it('extracts low emotionalRegulation when LLM returns reactive score', async () => {
      const text =
        'When I get upset I blow up and need a long time to calm down.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { emotionalRegulation: 2 },
          [
            {
              signal: 'emotionalRegulation',
              quote: 'When I get upset I blow up',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalRegulation']).toBe(2);
    });

    it('extracts high physicalAffectionStyle when LLM returns touch-focused score', async () => {
      const text =
        'Physical touch and cuddling every day is how I feel connected in a relationship.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalAffectionStyle: 8, attachmentSecurity: 6 },
          [
            {
              signal: 'physicalAffectionStyle',
              quote: 'Physical touch and cuddling every day is how I feel connected',
            },
            { signal: 'attachmentSecurity', quote: 'feel connected in a relationship' },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalAffectionStyle']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'physicalAffectionStyle')).toBe(true);
    });

    it('extracts low physicalAffectionStyle when LLM returns minimal-touch score', async () => {
      const text =
        'I prefer minimal physical affection and need plenty of personal space.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalAffectionStyle: 2, independence: 7 },
          [
            {
              signal: 'physicalAffectionStyle',
              quote: 'prefer minimal physical affection',
            },
            { signal: 'independence', quote: 'need plenty of personal space' },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalAffectionStyle']).toBe(2);
    });

    it('returns null for Expansion-02 signals when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            emotionalRegulation: null,
            physicalAffectionStyle: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalRegulation']).toBeNull();
      expect(result.signals['physicalAffectionStyle']).toBeNull();
    });

    it('strips out-of-range emotionalRegulation to null via validateAndClean', async () => {
      const text = 'I rarely react emotionally and stay balanced when things get hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { emotionalRegulation: 11 },
          [
            {
              signal: 'emotionalRegulation',
              quote: 'rarely react emotionally and stay balanced when things get hard',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalRegulation']).toBeNull();
    });
  });

  describe('Expansion-03 shadow signals', () => {
    it('extracts high humorPlayfulness when LLM returns playfulness-focused score', async () => {
      const text =
        'I want someone I can be silly with after a long day — banter and inside jokes keep us close.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { humorPlayfulness: 8, attachmentSecurity: 6 },
          [
            {
              signal: 'humorPlayfulness',
              quote: 'someone I can be silly with after a long day',
            },
            {
              signal: 'attachmentSecurity',
              quote: 'banter and inside jokes keep us close',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['humorPlayfulness']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'humorPlayfulness')).toBe(
        true,
      );
    });

    it('extracts low humorPlayfulness when LLM returns serious-tone score', async () => {
      const text =
        'I prefer deep conversations over joking around — playfulness is not really my thing.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { humorPlayfulness: 2, emotionalDepth: 7 },
          [
            {
              signal: 'humorPlayfulness',
              quote: 'playfulness is not really my thing',
            },
            {
              signal: 'emotionalDepth',
              quote: 'prefer deep conversations over joking around',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['humorPlayfulness']).toBe(2);
    });

    it('returns null for humorPlayfulness when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            humorPlayfulness: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['humorPlayfulness']).toBeNull();
    });

    it('strips out-of-range humorPlayfulness to null via validateAndClean', async () => {
      const text =
        'Life is heavy enough — I need lightness and laughter in love every day.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { humorPlayfulness: 11 },
          [
            {
              signal: 'humorPlayfulness',
              quote: 'need lightness and laughter in love every day',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['humorPlayfulness']).toBeNull();
    });
  });

  describe('Expansion-04 shadow signals', () => {
    it('extracts high intellectualCuriosity when LLM returns relationship-need score', async () => {
      // Semantic: need for mental stimulation with a partner (not merely "I'm smart")
      const text =
        'I need regular deep conversations and learning together — intellectual connection keeps us close.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { intellectualCuriosity: 8, emotionalDepth: 6 },
          [
            {
              signal: 'intellectualCuriosity',
              quote: 'need regular deep conversations and learning together',
            },
            {
              signal: 'emotionalDepth',
              quote: 'intellectual connection keeps us close',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['intellectualCuriosity']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'intellectualCuriosity'),
      ).toBe(true);
    });

    it('extracts low intellectualCuriosity when LLM returns low mental-stimulation need', async () => {
      const text =
        'I prefer light conversation — deep ideas and learning together are not important to me in love.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { intellectualCuriosity: 2 },
          [
            {
              signal: 'intellectualCuriosity',
              quote: 'deep ideas and learning together are not important',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['intellectualCuriosity']).toBe(2);
    });

    it('extracts high creativeExpression when LLM returns creativity-as-identity score', async () => {
      // Semantic: need for creative outlets — not merely job title "artist"
      const text =
        'Making art is core to who I am — I need space and respect for creative time every week.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { creativeExpression: 8, independence: 6 },
          [
            {
              signal: 'creativeExpression',
              quote: 'Making art is core to who I am',
            },
            {
              signal: 'independence',
              quote: 'need space and respect for creative time',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['creativeExpression']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'creativeExpression'),
      ).toBe(true);
    });

    it('extracts low creativeExpression when LLM returns minimal-creative score', async () => {
      const text =
        'I am not interested in creative pursuits — art and making things are not part of my life.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { creativeExpression: 2 },
          [
            {
              signal: 'creativeExpression',
              quote: 'not interested in creative pursuits',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['creativeExpression']).toBe(2);
    });

    it('returns null for creativeExpression when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            creativeExpression: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['creativeExpression']).toBeNull();
    });

    it('strips out-of-range creativeExpression to null via validateAndClean', async () => {
      const text =
        'Creativity is my core identity — I need daily time to make and create.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { creativeExpression: 11 },
          [
            {
              signal: 'creativeExpression',
              quote: 'Creativity is my core identity',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['creativeExpression']).toBeNull();
    });
  });
});
