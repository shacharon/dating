import { ExtractionService } from '../extraction.service';
import {
  createExtractionServiceTestContext,
  mockBehaviorLockResponse,
  mockExtractionResponse,
} from '../core/extraction.service.spec-support';

describe('ExtractionService expansion shadow (05-08)', () => {
  let service: ExtractionService;
  let llmCompleteJSON: jest.Mock;

  const mockResponse = mockBehaviorLockResponse;

  beforeEach(async () => {
    ({ service, llmCompleteJSON } = await createExtractionServiceTestContext());
  });

  describe('Expansion-05 shadow signals', () => {
    it('extracts high physicalActivityLevel when LLM returns athletic-behavior score', async () => {
      // Semantic: daily athletic/activity behavior — not merely wellness values
      const text =
        'I train hard most days — fitness and sports are a regular part of my life.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalActivityLevel: 8, healthBodyConsciousness: 6 },
          [
            {
              signal: 'physicalActivityLevel',
              quote: 'I train hard most days',
            },
            {
              signal: 'healthBodyConsciousness',
              quote: 'fitness and sports are a regular part',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalActivityLevel']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'physicalActivityLevel'),
      ).toBe(true);
    });

    it('extracts low physicalActivityLevel when LLM returns sedentary score', async () => {
      const text =
        'I prefer minimal movement — sedentary evenings on the couch suit me fine.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalActivityLevel: 2 },
          [
            {
              signal: 'physicalActivityLevel',
              quote: 'prefer minimal movement',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalActivityLevel']).toBe(2);
    });

    it('extracts high domesticComfort when LLM returns homebody score', async () => {
      // Semantic: home vs out preference — not socialBattery intro/extro
      const text =
        'I love cozy nights in on weekends — home is my comfort zone and I rarely want to go out.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { domesticComfort: 8, lifestylePace: 5 },
          [
            {
              signal: 'domesticComfort',
              quote: 'love cozy nights in on weekends',
            },
            {
              signal: 'lifestylePace',
              quote: 'home is my comfort zone',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['domesticComfort']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'domesticComfort'),
      ).toBe(true);
    });

    it('extracts low domesticComfort when LLM returns always-out score', async () => {
      const text =
        'I get restless at home — I always want to be out and rarely enjoy staying in.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { domesticComfort: 2 },
          [
            {
              signal: 'domesticComfort',
              quote: 'always want to be out',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['domesticComfort']).toBe(2);
    });

    it('returns null for Expansion-05 keys when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            physicalActivityLevel: null,
            domesticComfort: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalActivityLevel']).toBeNull();
      expect(result.signals['domesticComfort']).toBeNull();
    });

    it('strips out-of-range physicalActivityLevel to null via validateAndClean', async () => {
      const text =
        'Activity is central to my identity — I am highly athletic every day.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalActivityLevel: 11 },
          [
            {
              signal: 'physicalActivityLevel',
              quote: 'Activity is central to my identity',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalActivityLevel']).toBeNull();
    });
  });

  describe('Expansion-06 shadow signals', () => {
    it('extracts high adventureNovelty when LLM returns novelty-seeker score', async () => {
      // Semantic: "I love trying new places and hate doing the same thing twice"
      const text =
        'I love trying new places and hate doing the same thing twice. Spontaneous trips keep me alive.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { adventureNovelty: 9, lifestylePace: 5 },
          [
            {
              signal: 'adventureNovelty',
              quote: 'love trying new places and hate doing the same thing twice',
            },
            {
              signal: 'lifestylePace',
              quote: 'Spontaneous trips keep me alive',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['adventureNovelty']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'adventureNovelty'),
      ).toBe(true);
    });

    it('extracts low adventureNovelty when LLM returns routine-preference score', async () => {
      // Semantic: "I'm a creature of habit" / prefer familiar places
      const text =
        'I am a creature of habit. I prefer the places and routines I know.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { adventureNovelty: 2 },
          [
            {
              signal: 'adventureNovelty',
              quote: 'creature of habit',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['adventureNovelty']).toBe(2);
    });

    it('aliases legacy noveltyVsRoutine LLM output into adventureNovelty', async () => {
      const text =
        'I love spontaneity and trying new things. Always up for an adventure.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { noveltyVsRoutine: 8 },
          [
            {
              signal: 'noveltyVsRoutine',
              quote: 'love spontaneity and trying new things',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['adventureNovelty']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'adventureNovelty'),
      ).toBe(true);
    });

    it('returns null for adventureNovelty when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            adventureNovelty: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['adventureNovelty']).toBeNull();
    });

    it('strips out-of-range adventureNovelty to null via validateAndClean', async () => {
      const text =
        'Spontaneous trips and new experiences keep me alive — I need constant variety.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { adventureNovelty: 11 },
          [
            {
              signal: 'adventureNovelty',
              quote: 'new experiences keep me alive',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['adventureNovelty']).toBeNull();
    });
  });

  describe('Expansion-07 shadow signals', () => {
    it('extracts high casualIntimacyIntent when LLM returns hookup-oriented score', async () => {
      // Semantic: "Looking for fun, hookups, no strings attached"
      const text =
        'Looking for fun, hookups, no strings attached. Physical chemistry first.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { casualIntimacyIntent: 9 },
          [
            {
              signal: 'casualIntimacyIntent',
              quote: 'Looking for fun, hookups, no strings attached',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['casualIntimacyIntent']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'casualIntimacyIntent'),
      ).toBe(true);
    });

    it('extracts low casualIntimacyIntent when LLM returns committed-only score', async () => {
      // Semantic: "I only get physical when there's real emotional connection"
      const text =
        "I only get physical when there's real emotional connection. Looking for a partner, not a fling.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { casualIntimacyIntent: 2 },
          [
            {
              signal: 'casualIntimacyIntent',
              quote: "I only get physical when there's real emotional connection",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['casualIntimacyIntent']).toBe(2);
    });

    it('returns null for casualIntimacyIntent when no intimacy-boundary cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard and want something real.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, casualIntimacyIntent: null },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['casualIntimacyIntent']).toBeNull();
    });

    it('extracts high supportExchangeOrientation when LLM returns arrangement score', async () => {
      // Semantic: "Looking for a mutually beneficial arrangement"
      const text =
        'Looking for a mutually beneficial arrangement with clear expectations.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportExchangeOrientation: 9 },
          [
            {
              signal: 'supportExchangeOrientation',
              quote: 'mutually beneficial arrangement',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportExchangeOrientation']).toBe(9);
    });

    it('extracts low supportExchangeOrientation when LLM returns non-transactional score', async () => {
      // Semantic: "Money shouldn't be part of dating"
      const text =
        "Money shouldn't be part of dating. I want an equal partnership, not an arrangement.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportExchangeOrientation: 2 },
          [
            {
              signal: 'supportExchangeOrientation',
              quote: "Money shouldn't be part of dating",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportExchangeOrientation']).toBe(2);
    });

    it('extracts Profile-C style support set (high exchange+provider, low recipient)', async () => {
      // Semantic: "Happy to give you support — $1000 a month"
      const text =
        'Happy to give you support and enjoy — $1000 a month. Looking for companionship.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            supportExchangeOrientation: 9,
            supportProviderOrientation: 9,
            supportRecipientOrientation: 2,
          },
          [
            {
              signal: 'supportExchangeOrientation',
              quote: 'Happy to give you support and enjoy — $1000 a month',
            },
            {
              signal: 'supportProviderOrientation',
              quote: '$1000 a month',
            },
            {
              signal: 'supportRecipientOrientation',
              quote: 'Happy to give you support',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportExchangeOrientation']).toBe(9);
      expect(result.signals['supportProviderOrientation']).toBe(9);
      expect(result.signals['supportRecipientOrientation']).toBe(2);
    });

    it('extracts high supportProviderOrientation when LLM returns provider score', async () => {
      const text =
        "I'm looking for someone I can take care of financially as the provider.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportProviderOrientation: 8 },
          [
            {
              signal: 'supportProviderOrientation',
              quote: 'take care of financially as the provider',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportProviderOrientation']).toBe(8);
    });

    it('extracts low supportProviderOrientation when LLM returns equal-split score', async () => {
      const text =
        "Equal partnership — we both contribute. I don't want to be someone's wallet.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportProviderOrientation: 2 },
          [
            {
              signal: 'supportProviderOrientation',
              quote: "don't want to be someone's wallet",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportProviderOrientation']).toBe(2);
    });

    it('extracts high supportRecipientOrientation when LLM returns seeking-support score', async () => {
      const text =
        'Looking for someone who can support me financially on an ongoing basis.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportRecipientOrientation: 8 },
          [
            {
              signal: 'supportRecipientOrientation',
              quote: 'someone who can support me financially',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportRecipientOrientation']).toBe(8);
    });

    it('extracts low supportRecipientOrientation when LLM returns independence score', async () => {
      const text =
        "I support myself — don't need a provider. I want an equal partner, not a sponsor.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportRecipientOrientation: 2 },
          [
            {
              signal: 'supportRecipientOrientation',
              quote: "don't need a provider",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportRecipientOrientation']).toBe(2);
    });

    it('extracts high religiousObservance when LLM returns practice-focused score', async () => {
      // Semantic: "I keep kosher, Shabbat observant, looking for same"
      const text =
        'I keep kosher, Shabbat observant, looking for same. Practice is non-negotiable.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { religiousObservance: 9 },
          [
            {
              signal: 'religiousObservance',
              quote: 'I keep kosher, Shabbat observant',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['religiousObservance']).toBe(9);
    });

    it('extracts low religiousObservance when LLM returns secular score', async () => {
      // Semantic: "Spiritual but not observant" / cultural only
      const text =
        'Jewish by culture, not practice. Spiritual but not observant.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { religiousObservance: 2, spirituality: 7 },
          [
            {
              signal: 'religiousObservance',
              quote: 'Jewish by culture, not practice',
            },
            {
              signal: 'spirituality',
              quote: 'Spiritual but not observant',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['religiousObservance']).toBe(2);
    });

    it('returns null for religiousObservance when no practice cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, religiousObservance: null },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['religiousObservance']).toBeNull();
    });

    it('strips out-of-range Expansion-07 signal to null via validateAndClean', async () => {
      const text =
        'I keep kosher and Shabbat — religious practice is central to my life.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { religiousObservance: 11 },
          [
            {
              signal: 'religiousObservance',
              quote: 'religious practice is central to my life',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['religiousObservance']).toBeNull();
    });

    it('extracts partner religiousObservance when LLM returns desired-partner practice score', async () => {
      // Semantic: looking for a religious / observant partner
      const text =
        'Looking for a religious partner who keeps kosher and Shabbat.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { religiousObservance: 8 },
          [
            {
              signal: 'religiousObservance',
              quote: 'religious partner who keeps kosher and Shabbat',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['religiousObservance']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'religiousObservance'),
      ).toBe(true);
    });
  });

  describe('Expansion-08 shadow signals', () => {
    it('extracts high educationLevel when LLM returns degree-filter score', async () => {
      // Semantic: "Only university-educated with a bachelor's" / "רק עם תואר ראשון"
      const text =
        "Only university-educated with a bachelor's — looking for the same.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { educationLevel: 9 },
          [
            {
              signal: 'educationLevel',
              quote: "Only university-educated with a bachelor's",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['educationLevel']).toBe(9);
      expect(result.evidence.some((e) => e.signal === 'educationLevel')).toBe(
        true,
      );
    });

    it('extracts low educationLevel when LLM returns credentials-do-not-matter score', async () => {
      // Semantic: "Degrees don't impress me" / street smarts over diplomas
      const text =
        "Degrees don't impress me. Street smarts over diplomas every time.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { educationLevel: 2 },
          [
            {
              signal: 'educationLevel',
              quote: "Degrees don't impress me",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['educationLevel']).toBe(2);
    });

    it('returns null for educationLevel when only "smart" cues exist', async () => {
      const text = "I'm smart and love deep conversations about ideas.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { intellectualCuriosity: 8, educationLevel: null },
          [
            {
              signal: 'intellectualCuriosity',
              quote: 'love deep conversations about ideas',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['educationLevel']).toBeNull();
    });

    it('extracts high honestyIntegrity when LLM returns integrity-central score', async () => {
      // Semantic: "ישרה כמו סרגל" / "Looking for someone honest as a ruler"
      const text =
        'Looking for someone honest as a ruler. No games, no lies.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { honestyIntegrity: 9 },
          [
            {
              signal: 'honestyIntegrity',
              quote: 'honest as a ruler. No games, no lies',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['honestyIntegrity']).toBe(9);
    });

    it('returns null for honestyIntegrity when honesty is unmentioned', async () => {
      const text = 'I am ambitious and driven. I work hard and want something real.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, honestyIntegrity: null },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['honestyIntegrity']).toBeNull();
    });

    it('extracts high chronotype when LLM returns night-owl score', async () => {
      // Semantic: "לישון עד מאוחר בשבת" / sleep late Saturday
      const text =
        'I love sleeping late on Saturday — you too? Night owl energy.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { chronotype: 9 },
          [
            {
              signal: 'chronotype',
              quote: 'I love sleeping late on Saturday',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['chronotype']).toBe(9);
    });

    it('extracts low chronotype when LLM returns early-bird score', async () => {
      const text = 'Up at 5am every day. Early mornings are my thing.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { chronotype: 2 },
          [
            {
              signal: 'chronotype',
              quote: 'Up at 5am every day',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['chronotype']).toBe(2);
    });

    it('returns null for chronotype when no sleep rhythm cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, chronotype: null },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['chronotype']).toBeNull();
    });

    it('extracts high physicalTypePreference when LLM returns exclusive type score', async () => {
      // Semantic: "אוהב שמנות ומלאות" / curvy preference
      const text = 'I love curvy/fuller women — that type is a must for me.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalTypePreference: 9 },
          [
            {
              signal: 'physicalTypePreference',
              quote: 'I love curvy/fuller women',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalTypePreference']).toBe(9);
    });

    it('extracts low physicalTypePreference when LLM returns flexible/appearance-agnostic score', async () => {
      // Semantic: "לא איכפת לו ממראה חיצוני"
      const text =
        "Doesn't care about appearance — personality matters more than body type.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalTypePreference: 2 },
          [
            {
              signal: 'physicalTypePreference',
              quote: "Doesn't care about appearance",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalTypePreference']).toBe(2);
    });

    it('returns null for physicalTypePreference when only "beautiful" cues exist', async () => {
      const text = 'Looking for someone beautiful and attractive.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalTypePreference: null },
          [],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalTypePreference']).toBeNull();
    });

    it('strips out-of-range Expansion-08 signal to null via validateAndClean', async () => {
      const text =
        'Only university-educated with a bachelor\'s — degree required.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { educationLevel: 11 },
          [
            {
              signal: 'educationLevel',
              quote: 'degree required',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['educationLevel']).toBeNull();
    });

    it('extracts partner educationLevel when LLM returns desired-partner credential score', async () => {
      const text =
        'Looking for a partner with at least a bachelor\'s degree from university.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { educationLevel: 8 },
          [
            {
              signal: 'educationLevel',
              quote: "bachelor's degree from university",
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['educationLevel']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'educationLevel')).toBe(
        true,
      );
    });

    it('extracts partner physicalTypePreference when LLM returns desired-partner type score', async () => {
      const text = 'Looking for an athletic, fit partner — that build matters.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { physicalTypePreference: 8 },
          [
            {
              signal: 'physicalTypePreference',
              quote: 'athletic, fit partner',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['physicalTypePreference']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'physicalTypePreference'),
      ).toBe(true);
    });
  });
});
