import { ExtractionService } from '../extraction.service';
import {
  createExtractionServiceTestContext,
  mockBehaviorLockResponse,
  mockExtractionResponse,
} from '../core/extraction.service.spec-support';

describe('ExtractionService expansion shadow (10-13)', () => {
  let service: ExtractionService;
  let llmCompleteJSON: jest.Mock;

  const mockResponse = mockBehaviorLockResponse;

  beforeEach(async () => {
    ({ service, llmCompleteJSON } = await createExtractionServiceTestContext());
  });

  describe('Expansion-10 shadow signals', () => {
    it('extracts high repairSkills when LLM returns active-repair score', async () => {
      // Semantic: "I always try to apologize first" / "אני תמיד מתנצל/ת ראשון/ה"
      const text =
        'I always try to apologize first after a fight, even if I think I am partly right.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { repairSkills: 9 },
          [
            {
              signal: 'repairSkills',
              quote: 'I always try to apologize first after a fight',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['repairSkills']).toBe(9);
      expect(result.evidence.some((e) => e.signal === 'repairSkills')).toBe(
        true,
      );
    });

    it('extracts low repairSkills when LLM returns avoid-resolution score', async () => {
      // Semantic: "I rarely admit I'm wrong"
      const text = "I rarely admit I'm wrong after we argue.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { repairSkills: 2 },
          [
            {
              signal: 'repairSkills',
              quote: "I rarely admit I'm wrong",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['repairSkills']).toBe(2);
    });

    it('returns null for repairSkills when conflict aftermath is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, repairSkills: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['repairSkills']).toBeNull();
    });

    it('returns null for repairSkills when only "need space after a fight" alone', async () => {
      // Healthy temporary cool-down ≠ automatically low repairSkills
      const text = 'I need space after a fight.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse('self', { repairSkills: null }, []),
      );

      const result = await service.extract('self', text);

      expect(result.signals['repairSkills']).toBeNull();
    });

    it('extracts high forgivenessStyle when LLM returns no-grudge score', async () => {
      // Semantic: "I don't hold grudges" / "אני לא שומר/ת טינה"
      const text =
        "I don't hold grudges — once we talk it out, it's done.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { forgivenessStyle: 9 },
          [
            {
              signal: 'forgivenessStyle',
              quote: "I don't hold grudges — once we talk it out, it's done",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['forgivenessStyle']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'forgivenessStyle'),
      ).toBe(true);
    });

    it('extracts low forgivenessStyle when LLM returns rehash score', async () => {
      // Semantic: "Old fights tend to come back up"
      const text =
        'I remember things for a long time and old fights tend to come back up.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { forgivenessStyle: 2 },
          [
            {
              signal: 'forgivenessStyle',
              quote: 'old fights tend to come back up',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['forgivenessStyle']).toBe(2);
    });

    it('returns null for forgivenessStyle when grudges are unmentioned', async () => {
      const text = 'I am ambitious and driven. I work hard and want something real.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, forgivenessStyle: null },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['forgivenessStyle']).toBeNull();
    });

    it('strips out-of-range Expansion-10 scores to null', async () => {
      const text =
        'I always try to apologize first after a fight and reconnect quickly.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { repairSkills: 11 },
          [
            {
              signal: 'repairSkills',
              quote: 'apologize first after a fight',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['repairSkills']).toBeNull();
    });

    it('extracts partner repairSkills when LLM returns desired-partner repair score', async () => {
      const text =
        'Looking for a partner who apologizes and reconnects after we fight.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { repairSkills: 8 },
          [
            {
              signal: 'repairSkills',
              quote: 'apologizes and reconnects after we fight',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['repairSkills']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'repairSkills')).toBe(
        true,
      );
    });

    it('extracts partner forgivenessStyle when LLM returns desired-partner let-go score', async () => {
      const text =
        'I want someone who lets go easily and does not hold grudges.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { forgivenessStyle: 8 },
          [
            {
              signal: 'forgivenessStyle',
              quote: 'lets go easily and does not hold grudges',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['forgivenessStyle']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'forgivenessStyle'),
      ).toBe(true);
    });
  });

  describe('Expansion-11 shadow signals', () => {
    it('extracts high stressResponse when LLM returns seek-closeness score', async () => {
      // Semantic: "When I'm stressed I need my partner close" / Hebrew stress closeness
      const text =
        "When I'm stressed I need my partner close, I don't want to be alone.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { stressResponse: 9 },
          [
            {
              signal: 'stressResponse',
              quote: "When I'm stressed I need my partner close",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['stressResponse']).toBe(9);
      expect(result.evidence.some((e) => e.signal === 'stressResponse')).toBe(
        true,
      );
    });

    it('extracts low stressResponse when LLM returns withdraw score', async () => {
      // Semantic: "I handle stress better alone"
      const text = 'I need space to process on my own before I can talk.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { stressResponse: 2 },
          [
            {
              signal: 'stressResponse',
              quote: 'I need space to process on my own',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['stressResponse']).toBe(2);
    });

    it('returns null for stressResponse when stress-time behavior is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, stressResponse: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['stressResponse']).toBeNull();
    });

    it('extracts high jealousySecurity when LLM returns jealous score', async () => {
      // Semantic: "I get jealous easily" / "אני מתקנא בקלות" — HIGH = more jealous
      const text =
        'I get jealous easily and need to know where you are.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { jealousySecurity: 9 },
          [
            {
              signal: 'jealousySecurity',
              quote: 'I get jealous easily and need to know where you are',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['jealousySecurity']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'jealousySecurity'),
      ).toBe(true);
    });

    it('extracts low jealousySecurity when LLM returns secure/trusting score', async () => {
      // Semantic: "I fully trust my partner, no jealousy" — LOW = secure
      const text =
        "I fully trust my partner and don't get jealous.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { jealousySecurity: 2 },
          [
            {
              signal: 'jealousySecurity',
              quote: "I fully trust my partner and don't get jealous",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['jealousySecurity']).toBe(2);
    });

    it('returns null for jealousySecurity when jealousy/trust is unmentioned', async () => {
      const text = 'I am ambitious and driven. I work hard and want something real.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, jealousySecurity: null },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['jealousySecurity']).toBeNull();
    });

    it('strips out-of-range Expansion-11 scores to null', async () => {
      const text =
        "When I'm stressed I need my partner close and I don't want to be alone.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { stressResponse: 11 },
          [
            {
              signal: 'stressResponse',
              quote: "When I'm stressed I need my partner close",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['stressResponse']).toBeNull();
    });

    it('extracts partner stressResponse when LLM returns desired-partner stress score', async () => {
      const text =
        'Looking for a partner who wants closeness when stressed, not distance.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { stressResponse: 8 },
          [
            {
              signal: 'stressResponse',
              quote: 'wants closeness when stressed',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['stressResponse']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'stressResponse')).toBe(
        true,
      );
    });

    it('extracts partner jealousySecurity when LLM returns desired-partner jealousy score', async () => {
      const text =
        'I want a partner who gets jealous easily and needs check-ins.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { jealousySecurity: 8 },
          [
            {
              signal: 'jealousySecurity',
              quote: 'gets jealous easily and needs check-ins',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['jealousySecurity']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'jealousySecurity'),
      ).toBe(true);
    });
  });

  describe('Expansion-12 shadow signals', () => {
    it('extracts high listeningPresence when LLM returns deeply-present score', async () => {
      // Semantic: "I always put my phone away when my partner is talking" / Hebrew phone-away
      const text =
        'I always put my phone away when my partner is talking to me.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { listeningPresence: 9 },
          [
            {
              signal: 'listeningPresence',
              quote: 'I always put my phone away when my partner is talking',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['listeningPresence']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'listeningPresence'),
      ).toBe(true);
    });

    it('extracts low listeningPresence when LLM returns distracted score', async () => {
      // Semantic: "I get distracted easily during conversations"
      const text = 'I get distracted easily during conversations.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { listeningPresence: 2 },
          [
            {
              signal: 'listeningPresence',
              quote: 'I get distracted easily during conversations',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['listeningPresence']).toBe(2);
    });

    it('returns null for listeningPresence when listening behavior is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, listeningPresence: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['listeningPresence']).toBeNull();
    });

    it('extracts high emotionalExpression when LLM returns very-expressive score', async () => {
      // Semantic: "I tell my partner I love them multiple times a day" / Hebrew love-you-often
      const text =
        'I tell my partner I love them multiple times a day.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { emotionalExpression: 9 },
          [
            {
              signal: 'emotionalExpression',
              quote: 'I tell my partner I love them multiple times a day',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalExpression']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'emotionalExpression'),
      ).toBe(true);
    });

    it('extracts low emotionalExpression when LLM returns reserved score', async () => {
      // Semantic: "I show love through actions, not words"
      const text = 'I show love through actions, not words.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { emotionalExpression: 2 },
          [
            {
              signal: 'emotionalExpression',
              quote: 'I show love through actions, not words',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalExpression']).toBe(2);
    });

    it('returns null for emotionalExpression when expression style is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, emotionalExpression: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalExpression']).toBeNull();
    });

    it('strips out-of-range Expansion-12 scores to null', async () => {
      const text =
        'I always put my phone away when my partner is talking to me.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { listeningPresence: 11 },
          [
            {
              signal: 'listeningPresence',
              quote: 'I always put my phone away when my partner is talking',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['listeningPresence']).toBeNull();
    });

    it('extracts partner listeningPresence when LLM returns desired-partner listening score', async () => {
      const text =
        'Looking for a partner who puts their phone away and really listens.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { listeningPresence: 8 },
          [
            {
              signal: 'listeningPresence',
              quote: 'puts their phone away and really listens',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['listeningPresence']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'listeningPresence'),
      ).toBe(true);
    });

    it('extracts partner emotionalExpression when LLM returns desired-partner expression score', async () => {
      const text =
        'I want a partner who says I love you often and is open about feelings.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { emotionalExpression: 8 },
          [
            {
              signal: 'emotionalExpression',
              quote: 'says I love you often and is open about feelings',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['emotionalExpression']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'emotionalExpression'),
      ).toBe(true);
    });
  });

  describe('Expansion-13 shadow signals', () => {
    it('extracts high growthMindset when LLM returns strongly growth-oriented score', async () => {
      // Semantic: "I'm always working on becoming a better partner" / Hebrew always-working
      const text = "I'm always working on becoming a better partner.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { growthMindset: 9 },
          [
            {
              signal: 'growthMindset',
              quote: "I'm always working on becoming a better partner",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['growthMindset']).toBe(9);
      expect(result.evidence.some((e) => e.signal === 'growthMindset')).toBe(
        true,
      );
    });

    it('extracts low growthMindset when LLM returns defensive/fixed score', async () => {
      // Semantic: "I am who I am, I'm not going to change"
      const text = "I am who I am, I'm not going to change.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { growthMindset: 2 },
          [
            {
              signal: 'growthMindset',
              quote: "I am who I am, I'm not going to change",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['growthMindset']).toBe(2);
    });

    it('returns null for growthMindset when change/feedback stance is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, growthMindset: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['growthMindset']).toBeNull();
    });

    it('extracts high selfAwareness when LLM returns deep-insight score', async () => {
      // Semantic: "I know I shut down when criticized, so I try to pause" / Hebrew defensive-when-criticized
      const text =
        'I know I tend to shut down when I feel criticized, so I try to pause first.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { selfAwareness: 9 },
          [
            {
              signal: 'selfAwareness',
              quote: 'I know I tend to shut down when I feel criticized',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['selfAwareness']).toBe(9);
      expect(result.evidence.some((e) => e.signal === 'selfAwareness')).toBe(
        true,
      );
    });

    it('extracts low selfAwareness when LLM returns little-insight score', async () => {
      // Semantic: "I don't know why I react the way I do"
      const text = "I don't know why I react the way I do.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { selfAwareness: 2 },
          [
            {
              signal: 'selfAwareness',
              quote: "I don't know why I react the way I do",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['selfAwareness']).toBe(2);
    });

    it('returns null for selfAwareness when self-reflective language is unmentioned', async () => {
      const text = 'I am ambitious and love deep conversations about ideas.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, selfAwareness: null },
          [{ signal: 'ambition', quote: 'ambitious' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['selfAwareness']).toBeNull();
    });

    it('strips out-of-range Expansion-13 scores to null', async () => {
      const text = "I'm always working on becoming a better partner.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { growthMindset: 11 },
          [
            {
              signal: 'growthMindset',
              quote: "I'm always working on becoming a better partner",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['growthMindset']).toBeNull();
    });

    it('extracts partner growthMindset when LLM returns desired-partner growth score', async () => {
      const text =
        'I want a partner who welcomes feedback and works on themselves.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { growthMindset: 8 },
          [
            {
              signal: 'growthMindset',
              quote: 'welcomes feedback and works on themselves',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['growthMindset']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'growthMindset')).toBe(
        true,
      );
    });

    it('extracts partner selfAwareness when LLM returns desired-partner insight score', async () => {
      const text =
        'I want a partner who knows their own patterns and can name their triggers.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { selfAwareness: 8 },
          [
            {
              signal: 'selfAwareness',
              quote: 'knows their own patterns and can name their triggers',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['selfAwareness']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'selfAwareness')).toBe(
        true,
      );
    });
  });
});
