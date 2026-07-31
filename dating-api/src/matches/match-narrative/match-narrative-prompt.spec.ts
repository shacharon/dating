import { buildMatchNarrativeFactPack } from './match-narrative-fact-pack';
import {
  buildMatchNarrativeSystemPrompt,
  buildMatchNarrativeUserPrompt,
  toLlmPromptFacts,
} from './match-narrative-prompt';
import { MATCH_NARRATIVE_PROMPT_VERSION } from './match-narrative.types';
import { LLM_SAFE_NEXT_ACTION } from './match-narrative-voice';

describe('match-narrative prompts (voice v3)', () => {
  it('system prompt bans fluff, requires friend voice and concrete closer', () => {
    const system = buildMatchNarrativeSystemPrompt();
    expect(system).toMatch(/ONLY the facts/i);
    expect(system).toMatch(/5–12|5-12/);
    expect(system.toLowerCase()).toContain('alignment');
    expect(system.toLowerCase()).toContain('solid foundation');
    expect(system.toLowerCase()).toContain('worth a closer look');
    expect(system.toLowerCase()).toContain('mutual appreciation');
    expect(system.toLowerCase()).toContain('sharp friend');
    expect(system).toMatch(/concrete next beat/i);
    expect(system).toMatch(/profileExcerpts/i);
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

  it('sanitizes Worth a closer look out of LLM facts', () => {
    const pack = buildMatchNarrativeFactPack({
      finalScore: 55,
      explainability: {
        positiveChips: ['Emotional depth'],
        reasonShort: 'x',
      },
      recommendation: {
        suggestedNextAction: 'Worth a closer look',
      },
    });
    const facts = toLlmPromptFacts(pack);
    expect(facts.suggestedNextAction).toBe(LLM_SAFE_NEXT_ACTION);
    expect(JSON.stringify(facts)).not.toContain('Worth a closer look');
    expect(buildMatchNarrativeUserPrompt(pack)).not.toContain(
      'Worth a closer look',
    );
  });

  it('exports prompt version v4', () => {
    expect(MATCH_NARRATIVE_PROMPT_VERSION).toBe('v4');
  });

  it('includes redacted profileExcerpts in lean JSON without chip labels', () => {
    const pack = buildMatchNarrativeFactPack({
      finalScore: 62,
      explainability: {
        positiveChips: ['Emotional depth', 'Ambition alignment'],
        reasonShort: 'Solid.',
      },
      viewerAbout: {
        aboutMe:
          'I need solitude and quiet creative mornings before talking to anyone.',
      },
      candidateAbout: {
        aboutMe:
          'Solitude helps me reset; weekends are for deep focus and walks.',
      },
    });
    const user = buildMatchNarrativeUserPrompt(pack);
    expect(user).toContain('profileExcerpts');
    expect(user.toLowerCase()).toContain('solitude');
    expect(user).not.toContain('Ambition alignment');
    expect(user).toMatch(/already redacted/i);
    expect(user).not.toMatch(/Do not use any profile free-text/i);
  });
});
