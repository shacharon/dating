import { buildMatchNarrativeFactPack } from './match-narrative-fact-pack';
import {
  buildMatchNarrativeSystemPrompt,
  buildMatchNarrativeUserPrompt,
  toLlmPromptFacts,
} from './match-narrative-prompt';
import { MATCH_NARRATIVE_PROMPT_VERSION } from './match-narrative.types';

describe('match-narrative prompts (Story 4 voice)', () => {
  it('system prompt bans fluff and requires friend voice', () => {
    const system = buildMatchNarrativeSystemPrompt();
    expect(system).toMatch(/ONLY the facts/i);
    expect(system).toMatch(/5–12|5-12/);
    expect(system.toLowerCase()).toContain('alignment');
    expect(system.toLowerCase()).toContain('solid foundation');
    expect(system.toLowerCase()).toContain('sharp friend');
  });

  it('user prompt is lean: evidence only, no chip labels / about*', () => {
    const pack = buildMatchNarrativeFactPack({
      finalScore: 62,
      explainability: {
        positiveChips: ['Lifestyle pace', 'Emotional depth', 'Ambition alignment'],
        reasonShort: 'Solid.',
        tensionChip: 'Different pace of life',
        sharedInterestNote: 'You both enjoy cooking.',
      },
      sharedInterests: ['cooking'],
    });
    const user = buildMatchNarrativeUserPrompt(pack);
    expect(user).toContain('"scoreBand": "solid"');
    expect(user).toContain('"evidence"');
    expect(user).toContain('tensionNote');
    expect(user).not.toContain('positiveChips');
    expect(user).not.toContain('Ambition alignment');
    expect(user).not.toContain('Lifestyle pace');
    expect(user).not.toContain('"label"');
    expect(user).not.toContain('"group"');
    expect(user).not.toContain('"traits"');
    expect(user).not.toMatch(/"aboutMe"/);
    expect(user).not.toMatch(/"aboutPartner"/);
    expect(user).not.toMatch(/"aboutRelationship"/);
    expect(user).not.toContain('finalScore');

    const facts = toLlmPromptFacts(pack);
    expect(facts.evidence.length).toBeGreaterThan(0);
    expect(facts.tensionNote).toMatch(/different speeds|worth naming/i);
  });

  it('exports prompt version v2', () => {
    expect(MATCH_NARRATIVE_PROMPT_VERSION).toBe('v2');
  });
});
