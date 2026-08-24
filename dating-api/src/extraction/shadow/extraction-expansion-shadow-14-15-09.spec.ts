import { ExtractionService } from '../extraction.service';
import {
  createExtractionServiceTestContext,
  mockBehaviorLockResponse,
  mockExtractionResponse,
} from '../core/extraction.service.spec-support';
import { COMPATIBILITY_SIGNAL_KEYS } from '../../compatibility/compatibility-score';
import { SHADOW_SIGNAL_KEYS } from '../extracted-signals.interface';

describe('ExtractionService expansion shadow (14-15-09)', () => {
  let service: ExtractionService;
  let llmCompleteJSON: jest.Mock;

  const mockResponse = mockBehaviorLockResponse;

  beforeEach(async () => {
    ({ service, llmCompleteJSON } = await createExtractionServiceTestContext());
  });

  describe('Expansion-14 shadow signals', () => {
    it('extracts high patienceTolerance when LLM returns very-patient score', async () => {
      // Semantic: "Nobody's perfect, I try to be understanding about the little things"
      const text =
        "Nobody's perfect, I try to be understanding about the little things.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { patienceTolerance: 9 },
          [
            {
              signal: 'patienceTolerance',
              quote:
                "Nobody's perfect, I try to be understanding about the little things",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['patienceTolerance']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'patienceTolerance'),
      ).toBe(true);
    });

    it('extracts low patienceTolerance when LLM returns highly-critical score', async () => {
      // Semantic: "Little habits really bother me"
      const text = 'Little habits really bother me.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { patienceTolerance: 2 },
          [
            {
              signal: 'patienceTolerance',
              quote: 'Little habits really bother me',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['patienceTolerance']).toBe(2);
    });

    it('returns null for patienceTolerance when tolerance stance is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, patienceTolerance: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['patienceTolerance']).toBeNull();
    });

    it('extracts high intimacyPacing when LLM returns moves-fast score', async () => {
      // Semantic: "When I feel a connection I move fast"
      const text = 'When I feel a connection I move fast.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { intimacyPacing: 9 },
          [
            {
              signal: 'intimacyPacing',
              quote: 'When I feel a connection I move fast',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['intimacyPacing']).toBe(9);
      expect(result.evidence.some((e) => e.signal === 'intimacyPacing')).toBe(
        true,
      );
    });

    it('extracts low intimacyPacing when LLM returns takes-things-slow score', async () => {
      // Semantic: "I take things slow, need time before I open up" / Hebrew slow-open
      const text = 'I take things slow, need time before I open up.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { intimacyPacing: 2 },
          [
            {
              signal: 'intimacyPacing',
              quote: 'I take things slow, need time before I open up',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['intimacyPacing']).toBe(2);
    });

    it('returns null for intimacyPacing when pacing preference is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, intimacyPacing: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['intimacyPacing']).toBeNull();
    });

    it('extracts high monogamyAlignment when LLM returns open/poly score', async () => {
      // Semantic: "I'm ethically non-monogamous / poly" — HIGH = open (do not invert)
      const text = "I'm ethically non-monogamous and prefer a poly structure.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { monogamyAlignment: 9 },
          [
            {
              signal: 'monogamyAlignment',
              quote: "I'm ethically non-monogamous and prefer a poly structure",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['monogamyAlignment']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'monogamyAlignment'),
      ).toBe(true);
    });

    it('extracts low monogamyAlignment when LLM returns strict-mono score', async () => {
      // Semantic: "Looking for a committed, exclusive relationship only" / Hebrew exclusive-only
      const text = 'Looking for a committed, exclusive relationship only.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { monogamyAlignment: 2 },
          [
            {
              signal: 'monogamyAlignment',
              quote: 'Looking for a committed, exclusive relationship only',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['monogamyAlignment']).toBe(2);
    });

    it('returns null for monogamyAlignment when structure stance is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, monogamyAlignment: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['monogamyAlignment']).toBeNull();
    });

    it('strips out-of-range Expansion-14 scores to null', async () => {
      const text = "Nobody's perfect, I try to be understanding.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { patienceTolerance: 11 },
          [
            {
              signal: 'patienceTolerance',
              quote: "Nobody's perfect, I try to be understanding",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['patienceTolerance']).toBeNull();
    });

    it('extracts partner patienceTolerance when LLM returns desired-partner patience score', async () => {
      const text =
        'I want a partner who is patient with quirks and little differences.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { patienceTolerance: 8 },
          [
            {
              signal: 'patienceTolerance',
              quote: 'patient with quirks and little differences',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['patienceTolerance']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'patienceTolerance'),
      ).toBe(true);
    });

    it('extracts partner intimacyPacing when LLM returns desired-partner pacing score', async () => {
      const text = 'I want a partner who takes things slow into closeness.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { intimacyPacing: 8 },
          [
            {
              signal: 'intimacyPacing',
              quote: 'takes things slow into closeness',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['intimacyPacing']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'intimacyPacing')).toBe(
        true,
      );
    });

    it('extracts partner monogamyAlignment when LLM returns desired-partner structure score', async () => {
      // HIGH = open/poly polarity (do not invert); smoke score 8
      const text =
        'I want a partner who is open to ethically non-monogamous structures.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { monogamyAlignment: 8 },
          [
            {
              signal: 'monogamyAlignment',
              quote: 'open to ethically non-monogamous structures',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['monogamyAlignment']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'monogamyAlignment'),
      ).toBe(true);
    });
  });

  describe('Expansion-15 shadow signals', () => {
    it('extracts high familyEnmeshment when LLM returns highly-enmeshed score', async () => {
      // Semantic: "My family is very involved… they weigh in on big decisions" / Hebrew involved
      const text =
        'My family is very involved in my life, we talk every day and they weigh in on big decisions.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { familyEnmeshment: 9 },
          [
            {
              signal: 'familyEnmeshment',
              quote:
                'My family is very involved in my life, we talk every day and they weigh in on big decisions',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['familyEnmeshment']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'familyEnmeshment'),
      ).toBe(true);
    });

    it('extracts low familyEnmeshment when LLM returns independent-from-family score', async () => {
      // Semantic: "I make my own decisions, family isn't very involved"
      const text = "I make my own decisions, family isn't very involved.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { familyEnmeshment: 2 },
          [
            {
              signal: 'familyEnmeshment',
              quote: "I make my own decisions, family isn't very involved",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['familyEnmeshment']).toBe(2);
    });

    it('returns null for familyEnmeshment when family involvement is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, familyEnmeshment: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['familyEnmeshment']).toBeNull();
    });

    it('extracts high friendCoupleBalance when LLM returns couple-centric score', async () => {
      // Semantic: couple-centric HIGH (do not invert) — "most free time with partner"
      const text = 'I like most of my free time to be with my partner.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { friendCoupleBalance: 9 },
          [
            {
              signal: 'friendCoupleBalance',
              quote: 'most of my free time to be with my partner',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['friendCoupleBalance']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'friendCoupleBalance'),
      ).toBe(true);
    });

    it('extracts low friendCoupleBalance when LLM returns friends-first score', async () => {
      // Semantic: friends-first LOW — "friend group is a huge part of my identity"
      const text =
        'My friend group is a huge part of my life and identity.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { friendCoupleBalance: 2 },
          [
            {
              signal: 'friendCoupleBalance',
              quote: 'My friend group is a huge part of my life and identity',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['friendCoupleBalance']).toBe(2);
    });

    it('returns null for friendCoupleBalance when friend/couple balance is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, friendCoupleBalance: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['friendCoupleBalance']).toBeNull();
    });

    it('extracts high aloneTimeNeed when LLM returns strong-solo-recharge score', async () => {
      // Semantic: "I need my own space and time to recharge" / Hebrew alone-space
      const text =
        'I need my own space and time to recharge, even in a relationship.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { aloneTimeNeed: 9 },
          [
            {
              signal: 'aloneTimeNeed',
              quote:
                'I need my own space and time to recharge, even in a relationship',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['aloneTimeNeed']).toBe(9);
      expect(result.evidence.some((e) => e.signal === 'aloneTimeNeed')).toBe(
        true,
      );
    });

    it('extracts low aloneTimeNeed when LLM returns togetherness-preference score', async () => {
      // Semantic: "I want to spend as much time together as possible"
      const text = 'I want to spend as much time together as possible.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { aloneTimeNeed: 2 },
          [
            {
              signal: 'aloneTimeNeed',
              quote: 'spend as much time together as possible',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['aloneTimeNeed']).toBe(2);
    });

    it('returns null for aloneTimeNeed when alone-time preference is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, aloneTimeNeed: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['aloneTimeNeed']).toBeNull();
    });

    it('strips out-of-range Expansion-15 scores to null', async () => {
      const text = 'My family is very involved in my life.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { familyEnmeshment: 11 },
          [
            {
              signal: 'familyEnmeshment',
              quote: 'My family is very involved in my life',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['familyEnmeshment']).toBeNull();
    });

    it('extracts partner familyEnmeshment when LLM returns desired-partner family score', async () => {
      const text =
        'I want a partner whose family is not deeply involved in daily decisions.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { familyEnmeshment: 8 },
          [
            {
              signal: 'familyEnmeshment',
              quote: 'family is not deeply involved in daily decisions',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['familyEnmeshment']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'familyEnmeshment'),
      ).toBe(true);
    });

    it('extracts partner friendCoupleBalance when LLM returns desired-partner balance score', async () => {
      // HIGH = couple-centric polarity (do not invert); smoke score 8
      const text =
        'I want a partner who prioritizes couple time over friend groups.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { friendCoupleBalance: 8 },
          [
            {
              signal: 'friendCoupleBalance',
              quote: 'prioritizes couple time over friend groups',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['friendCoupleBalance']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'friendCoupleBalance'),
      ).toBe(true);
    });

    it('extracts partner aloneTimeNeed when LLM returns desired-partner alone-time score', async () => {
      const text =
        'I want a partner who needs their own space to recharge regularly.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { aloneTimeNeed: 8 },
          [
            {
              signal: 'aloneTimeNeed',
              quote: 'needs their own space to recharge regularly',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['aloneTimeNeed']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'aloneTimeNeed')).toBe(
        true,
      );
    });
  });

  describe('Expansion-09 interest tags', () => {
    it('preserves biking from mocked LLM interests', async () => {
      const text = 'I love cycling and mountain bike weekends.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse('self', {}, [], ['biking']),
      );

      const result = await service.extract('self', text);

      expect(result.rawInterests).toEqual(['biking']);
    });

    it('preserves camping from mocked LLM interests', async () => {
      const text = 'We do camping trips and sleep in a tent under the stars.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse('self', {}, [], ['camping']),
      );

      const result = await service.extract('self', text);

      expect(result.rawInterests).toEqual(['camping']);
    });

    it('preserves nature as lowercase canonical tag', async () => {
      const text = 'I love nature, forests, and wildlife.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse('self', {}, [], ['nature']),
      );

      const result = await service.extract('self', text);

      expect(result.rawInterests).toEqual(['nature']);
      expect(result.rawInterests).not.toContain('Nature');
    });

    it('allows coexistence of hiking, camping, and nature', async () => {
      const text =
        'I hike on weekends, go camping overnight, and love nature broadly.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {},
          [],
          ['hiking', 'camping', 'nature'],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.rawInterests).toEqual(['hiking', 'camping', 'nature']);
    });

    it('preserves biking for Hebrew אופניים fixture (mocked LLM)', async () => {
      const text = 'אני אוהב אופניים בסופי שבוע.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse('self', {}, [], ['biking']),
      );

      const result = await service.extract('self', text);

      expect(result.rawInterests).toEqual(['biking']);
    });

    it('preserves camping for Hebrew קמפינג fixture (mocked LLM)', async () => {
      const text = 'אנחנו יוצאים לקמפינג כמה פעמים בשנה.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse('self', {}, [], ['camping']),
      );

      const result = await service.extract('self', text);

      expect(result.rawInterests).toEqual(['camping']);
    });

    it('preserves nature for Hebrew אוהב טבע fixture (mocked LLM)', async () => {
      const text = 'אני אוהב טבע, יערות וחיות בר.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse('self', {}, [], ['nature']),
      );

      const result = await service.extract('self', text);

      expect(result.rawInterests).toEqual(['nature']);
    });

    it('case-normalizes Nature and drops non-canonical Running', async () => {
      const text = 'I like nature and running.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {},
          [],
          ['Nature', 'Running', 'biking'],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.rawInterests).toEqual(['nature', 'biking']);
    });

    it('omits rawInterests when LLM returns empty interests', async () => {
      const text = 'Looking for something real with a kind partner.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse('self', {}, [], []),
      );

      const result = await service.extract('self', text);

      expect(result.rawInterests).toBeUndefined();
    });

    it('includes Expansion-09 interest guidance in the system prompt', async () => {
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse('self', {}, [], []),
      );

      await service.extract('self', 'I love biking and camping in nature.');

      const call = llmCompleteJSON.mock.calls[0][0] as { system: string };
      expect(call.system).toContain('INTEREST TAG RULES');
      expect(call.system).toContain('biking');
      expect(call.system).toContain('camping');
      expect(call.system).toContain('nature');
      expect(call.system).not.toContain('-> "Nature"');
      expect(call.system).not.toContain('-> "Running"');
    });

    it('does not treat Expansion-09 tags as scored or shadow signals', () => {
      const scored = new Set<string>(COMPATIBILITY_SIGNAL_KEYS);
      const shadow = new Set<string>(SHADOW_SIGNAL_KEYS);
      for (const tag of ['biking', 'camping', 'nature'] as const) {
        expect(scored.has(tag)).toBe(false);
        expect(shadow.has(tag)).toBe(false);
      }
    });
  });
});
