import type { DatingMatchDetail, DatingMatchPreview } from './types';

/**
 * Static matches for /dating list + detail. Replace with API when ready.
 */
export const MOCK_MATCHES: readonly DatingMatchPreview[] = [
  {
    id: 'm-ava-01',
    name: 'Ava',
    age: 29,
    summary: 'Curious, outdoorsy, values honest conversation and slow weekends.',
    compatibilityScore: 88,
    strongReason: 'You both prioritize emotional clarity and similar social pace.',
    frictionPoint: 'She travels often for work; rhythm may need planning.',
    explainability: {
      positiveChips: ['Emotional depth', 'Direct communication', 'Shared values'],
      tensionChip: 'Different pace of life',
      reasonShort:
        'You both trend together on Emotional depth, Direct communication, and Shared values—that keeps the match feeling strong, not thin. Main tension: different pace of life.',
    },
    recommendation: {
      explainability: {
        positiveChips: ['Emotional depth', 'Direct communication', 'Shared values'],
        tensionChip: 'Different pace of life',
        reasonShort:
          'You both trend together on Emotional depth, Direct communication, and Shared values—that keeps the match feeling strong, not thin. Main tension: different pace of life.',
      },
      primaryTakeaway: 'Strong clear fit, especially around emotional depth.',
      caution: 'Watch for different pace of life.',
      suggestedNextAction: 'Start a conversation',
    },
  },
  {
    id: 'm-jordan-02',
    name: 'Jordan',
    age: 32,
    summary: 'Product designer who loves cooking, live music, and quiet mornings.',
    compatibilityScore: 84,
    strongReason: 'Shared appreciation for routine + spontaneous creative nights out.',
    frictionPoint: 'Different sleep schedules could take a short adjustment.',
    explainability: {
      positiveChips: ['Social rhythm', 'Lifestyle pace', 'Wellness focus'],
      reasonShort:
        'Clearest fit shows up around Social rhythm, Lifestyle pace, and Wellness focus; overall this reads as a solid match.',
    },
    recommendation: {
      explainability: {
        positiveChips: ['Social rhythm', 'Lifestyle pace', 'Wellness focus'],
        reasonShort:
          'Clearest fit shows up around Social rhythm, Lifestyle pace, and Wellness focus; overall this reads as a solid match.',
      },
      primaryTakeaway: 'Strong clear fit, especially around social rhythm.',
      suggestedNextAction: 'Start a conversation',
    },
  },
  {
    id: 'm-sam-03',
    name: 'Sam',
    age: 27,
    summary: 'Runner, reader, and volunteer—looking for depth without drama.',
    compatibilityScore: 81,
    strongReason: 'Alignment on long-term commitment and low-conflict communication.',
    frictionPoint: 'Sam is more introverted; you may need to initiate plans early on.',
  },
  {
    id: 'm-riley-04',
    name: 'Riley',
    age: 31,
    summary: 'Teacher and hobby photographer; family-oriented but independent.',
    compatibilityScore: 79,
    strongReason: 'Similar values around stability, humor, and small traditions.',
    frictionPoint: 'Weekend availability can clash during school term.',
  },
  {
    id: 'm-casey-05',
    name: 'Casey',
    age: 30,
    summary: 'Startup founder balancing ambition with intentional downtime.',
    compatibilityScore: 76,
    strongReason: 'Mutual respect for ambition and need for recharge time.',
    frictionPoint: 'Busy seasons at work may require extra patience.',
    explainability: {
      positiveChips: ['Ambition alignment', 'Independence fit'],
      tensionChip: 'Different social energy',
      reasonShort:
        'Ambition alignment and Independence fit are where your profiles align most; the overall read is solid. The friction point to watch is different social energy.',
    },
    recommendation: {
      explainability: {
        positiveChips: ['Ambition alignment', 'Independence fit'],
        tensionChip: 'Different social energy',
        reasonShort:
          'Ambition alignment and Independence fit are where your profiles align most; the overall read is solid. The friction point to watch is different social energy.',
      },
      primaryTakeaway: 'Solid fit with good alignment on ambition alignment.',
      caution: 'Watch for different social energy.',
      suggestedNextAction: 'Review profile and message',
    },
  },
  {
    id: 'm-morgan-06',
    name: 'Morgan',
    age: 28,
    summary: 'Clinical researcher who unwinds with pottery and long walks.',
    compatibilityScore: 73,
    strongReason: 'Both value calm communication and curiosity about other people.',
    frictionPoint: 'Evening shifts sometimes; daytime dates work best early on.',
  },
];

export function getMockMatchById(id: string): DatingMatchDetail | undefined {
  return MOCK_MATCHES.find((m) => m.id === id);
}
