/**
 * Sample outputs for match recommendation across different score bands.
 * Run: npm run test:samples
 */

import { buildMatchRecommendation } from './match-recommendation';
import type { MatchExplainabilityDto } from './match-explainability';

interface SampleCase {
  name: string;
  finalScore: number;
  friction: number;
  explainability: MatchExplainabilityDto;
  dealbreakers?: string[];
}

const samples: SampleCase[] = [
  {
    name: 'High score (85), no friction',
    finalScore: 85,
    friction: 0,
    explainability: {
      positiveChips: ['Emotional depth', 'Direct communication', 'Social rhythm'],
      reasonShort:
        'Clearest fit shows up around Emotional depth, Direct communication, and Social rhythm; overall this reads as a strong, clear match.',
    },
  },
  {
    name: 'High score (82), with friction',
    finalScore: 82,
    friction: 5,
    explainability: {
      positiveChips: ['Ambition alignment', 'Wellness focus'],
      tensionChip: 'Closeness vs space',
      reasonShort:
        'Ambition alignment and Wellness focus are where you line up most convincingly—a strong match overall. Main tension: closeness vs space.',
    },
  },
  {
    name: 'High score (88), with dealbreakers',
    finalScore: 88,
    friction: 1,
    explainability: {
      positiveChips: ['Shared values', 'Lifestyle pace'],
      reasonShort:
        'You both trend together on Shared values and Lifestyle pace, which supports a clear overall fit.',
    },
    dealbreakers: ['KIDS_MISMATCH'],
  },
  {
    name: 'Solid score (70), no friction',
    finalScore: 70,
    friction: 2,
    explainability: {
      positiveChips: ['Independence fit', 'Money mindset'],
      reasonShort:
        'Independence fit and Money mindset are where your profiles align most; the overall read is solid.',
    },
  },
  {
    name: 'Solid score (65), with friction',
    finalScore: 65,
    friction: 4,
    explainability: {
      positiveChips: ['Physical chemistry', 'Relationship expectations'],
      tensionChip: 'Different pace of life',
      reasonShort:
        'You both trend together on Physical chemistry and Relationship expectations—a solid match, not a fluke. The friction point to watch is different pace of life.',
    },
  },
  {
    name: 'Moderate score (55), minimal friction',
    finalScore: 55,
    friction: 1,
    explainability: {
      positiveChips: ['Secure attachment'],
      reasonShort:
        'Primary overlap on Secure attachment; there\'s also some alignment on Lifestyle pace, but overall it stays moderate.',
    },
  },
  {
    name: 'Moderate score (52), high friction',
    finalScore: 52,
    friction: 6,
    explainability: {
      positiveChips: ['Social rhythm'],
      tensionChip: 'Emotional depth gap',
      reasonShort:
        'The match is mixed overall, but Social rhythm shows a moderate area of overlap. Main tension: emotional depth gap.',
    },
  },
  {
    name: 'Partial score (45), no friction',
    finalScore: 45,
    friction: 2,
    explainability: {
      positiveChips: ['Relationship expectations'],
      reasonShort:
        'There\'s only partial overlap so far—Relationship expectations is the main place some alignment shows up.',
    },
  },
  {
    name: 'Partial score (42), with dealbreakers',
    finalScore: 42,
    friction: 1,
    explainability: {
      positiveChips: ['Direct communication'],
      reasonShort:
        'Direct communication captures a partial fit; elsewhere the signals look thin or conflicting.',
    },
    dealbreakers: ['LOCATION_MISMATCH', 'RELIGION_MISMATCH'],
  },
  {
    name: 'Low score (35), minimal friction',
    finalScore: 35,
    friction: 1,
    explainability: {
      positiveChips: ['Ambition alignment'],
      reasonShort:
        'Overall alignment looks limited; Ambition alignment is one of the few clearer touchpoints.',
    },
  },
  {
    name: 'Low score (28), no chips',
    finalScore: 28,
    friction: 0,
    explainability: {
      positiveChips: [],
      reasonShort:
        'Overall alignment looks weak; nothing is surfacing as a believable shared strength.',
    },
  },
  {
    name: 'Low score (38), with friction and dealbreakers',
    finalScore: 38,
    friction: 4,
    explainability: {
      positiveChips: ['Wellness focus'],
      tensionChip: 'Different money mindset',
      reasonShort:
        'Overall alignment looks limited; Wellness focus is one of the few clearer touchpoints. The friction point to watch is different money mindset.',
    },
    dealbreakers: ['KIDS_MISMATCH'],
  },
];

export function generateSampleOutputs(): string {
  let output = '# Match Recommendation Sample Outputs\n\n';
  output += 'Generated from match-recommendation.samples.ts\n\n';
  output += '---\n\n';

  for (const sample of samples) {
    const result = buildMatchRecommendation({
      finalScore: sample.finalScore,
      friction: sample.friction,
      explainability: sample.explainability,
      dealbreakers: sample.dealbreakers,
    });

    output += `## ${sample.name}\n\n`;
    output += `**Input:**\n`;
    output += `- finalScore: ${sample.finalScore}\n`;
    output += `- friction: ${sample.friction}\n`;
    output += `- positiveChips: ${sample.explainability.positiveChips.length > 0 ? sample.explainability.positiveChips.join(', ') : '(none)'}\n`;
    if (sample.explainability.tensionChip) {
      output += `- tensionChip: ${sample.explainability.tensionChip}\n`;
    }
    if (sample.dealbreakers && sample.dealbreakers.length > 0) {
      output += `- dealbreakers: ${sample.dealbreakers.join(', ')}\n`;
    }
    output += `\n**Output:**\n\n`;
    output += `\`\`\`json\n`;
    output += JSON.stringify(
      {
        primaryTakeaway: result.primaryTakeaway,
        ...(result.caution && { caution: result.caution }),
        suggestedNextAction: result.suggestedNextAction,
      },
      null,
      2,
    );
    output += `\n\`\`\`\n\n`;
    output += `**Explainability reasonShort:**\n`;
    output += `> ${sample.explainability.reasonShort}\n\n`;
    output += `---\n\n`;
  }

  return output;
}

if (require.main === module) {
  // eslint-disable-next-line no-console
  console.log(generateSampleOutputs());
}
