/**
 * Sprint 52 keyword engine: enrichment-v2 (structural split — Sprint 57 Story 02)
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN — docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 *
 * This module: conflictStyleDetail / communicationMode / autonomyTogethernessDepth.
 */

import {
  firstMatching,
  firstMatchingEarliest,
  isNegatedBefore,
} from './enrichment-keyword-helpers';

const AUTONOMY_RULES: { value: string; patterns: RegExp[] }[] = [
  {
    value: 'closeness_individuality',
    patterns: [
      /\bcloseness without losing individuality\b/i,
      /\bwithout losing (myself|individuality)\b/i,
    ],
  },
  {
    value: 'values_alone_time',
    patterns: [
      /\bneed alone time (?:to|for) (?:recharge|reset|decompress|think|think clearly)\b/i,
      /\bneed (?:my |our )?space (?:to|in order to) (?:recharge|reset|think)\b/i,
      /\bvalue (?:my|our) alone time\b/i,
      /\bvalues (?:my|our) alone time\b/i,
      /\bvalues?\s+alone time\s+to\s+(?:recharge|decompress|reset)\b/i,
      /\bvalue alone time\s+to\s+decompress\b/i,
      /\balone time (?:is|as) (?:essential|non[-\s]?negotiable|sacred)\b/i,
      /\bnon[-\s]?negotiable.{0,60}\balone time\b/is,
      /\balone time.{0,40}\bnon[-\s]?negotiable\b/is,
    ],
  },
  {
    value: 'enmeshment',
    patterns: [/\beverything together\b/i, /\bdo everything together\b/i],
  },
  {
    value: 'independence_with_space',
    patterns: [
      /\bneed my time\b/i,
      /\bneed my own time\b/i,
      /\bneed my (?:personal )?space\b/i,
      /\bdecompress(?:ing)?\s+alone\b/i,
      /\bsolo\s+recharges?\b/i,
      /\bneed\s+space\s+after\s+work\b/i,
      /\bneed\s+time\s+to\s+myself\b/i,
      /\bneed\s+time\s+to\s+yourselves\b/i,
      /\broom\s+to\s+breathe\b/i,
      /\bown\s+corners?\b/i,
      /\bown\s+lanes?\b/i,
      /\bneed\s+an?\s+hour\s+alone\b/i,
      /\bdecompress(?:ing)?\s+after\s+(?:a\s+)?shift\b/i,
      /\bneed\s+space\s+after\s+(?:work|conflict|(?:a\s+)?fight|tense\s+conversation|crowded|interpreting|(?:a\s+)?shift)\b/i,
      /\bneeds?\s+personal\s+space\s+after\b/i,
      /\bnot rushed into cohabiting\b/i,
      /\bspace after a fight\b/i,
      /\balone time to finish deep work\b/i,
    ],
  },
  {
    value: 'interdependence',
    patterns: [
      /\bindependent together\b/i,
      /\bspace but close\b/i,
      /\bindependent but connected\b/i,
      /\btogether but independent\b/i,
      /\bindependence and intimacy\b/i,
      /\binterdependence\b/i,
      /\binterdependent\b/i,
      /\bclose\s+but\s+not\s+fused\b/i,
      /\btogether\s+but\s+not\s+(?:on\s+top\s+of\s+each\s+other|all\s+over\s+each\s+other)\b/i,
      /\btogether\s+but\s+not\s+on\s+top\b/i,
      /\bseparate\s+hobbies(?:\s*,\s*shared\s+core)?\b/i,
      /\binterdependence\s+over\s+fusion\b/i,
      /\bslow pace on merging lives\b/i,
      /\blife outside mine\b/i,
    ],
  },
  {
    value: 'quality_over_quantity',
    patterns: [/\bquality time over quantity\b/i, /\bquality over quantity\b/i],
  },
];

function matchWithdrawsShutsDown(text: string): boolean {
  const rules: { source: string; negation: boolean }[] = [
    { source: String.raw`\bI shut down\b`, negation: false },
    {
      source: String.raw`\bshut(?:s|ting)? down (?:when|if|during|after)\b`,
      negation: true,
    },
    { source: String.raw`\b(?:go|going) silent\b`, negation: true },
    { source: String.raw`\bstonewall(?:ing)?\b`, negation: true },
    {
      source: String.raw`\bwithdraw(?:s|ing)? (?:when|if|during)\b`,
      negation: true,
    },
    { source: String.raw`\bfreeze(?:s|ing)? up\b`, negation: true },
  ];
  for (const { source, negation } of rules) {
    const re = new RegExp(source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (!negation || !isNegatedBefore(text, m.index)) return true;
    }
  }
  return false;
}

function matchConflictStyleV2(text: string): string | null {
  const escalateRules = [
    {
      value: 'escalates_quickly',
      patterns: [
        /\bescalate(?:s|d)?\s+(?:fast|quickly|rapidly|so fast)\b/i,
        /\bthings escalate (?:fast|quickly)\b/i,
        /\b(?:fights?|arguments?) (?:that )?escalate (?:fast|quickly)?\b/i,
        /\b(?:I |we )escalate\b/i,
        /\b(?:gets?|getting) (?:heated|intense)\b/i,
        /\bvoice gets loud\b/i,
        /\bblow(?:s|ing)? up (?:in|during|when)\b/i,
      ],
    },
  ];
  if (firstMatching(text, escalateRules)) return 'escalates_quickly';
  if (matchWithdrawsShutsDown(text)) return 'withdraws_shuts_down';

  const humorRules = [
    {
      value: 'humor_deflect',
      patterns: [
        /\bhumor (?:to|and) deflect\b/i,
        /\bdeflect(?:s|ing)? with humor\b/i,
        /\bjoke to (?:lighten|defuse)\b/i,
        /\buse(?:s|ing)? humor when (?:things get|it gets) (?:heavy|serious)\b/i,
      ],
    },
  ];
  if (firstMatching(text, humorRules)) return 'humor_deflect';

  const indirectRules = [
    {
      value: 'indirect_communication',
      patterns: [
        /\bpassive[-\s]?aggressive\b/i,
        /\bread between the lines\b/i,
        /\btoo much subtext\b/i,
        /\bsubtext (?:instead|rather than|over)\b/i,
        /\bbeat around the bush\b/i,
        /\bindirect (?:communication|communicator|style)\b/i,
        /\bhint(?:s|ing)? instead of (?:saying|telling|being)\b/i,
        /\bdrop(?:ping)? hints (?:instead|rather than)\b/i,
        /\bnot (?:very )?direct when (?:upset|mad|hurt|angry)\b/i,
      ],
    },
  ];
  if (firstMatching(text, indirectRules)) return 'indirect_communication';

  const cooldownRules = [
    {
      value: 'cooldown_then_talk',
      patterns: [
        /\bcool(?:\s|-)?down after\b/i,
        /\bcooldown after\b/i,
        /\bneed(?:s)? (?:an? |some )?hour alone before\b/i,
        /\btime to cool off\b/i,
        /\bspace after (?:a )?(?:fight|conflict|argument)\b/i,
        /\bpause before (?:I |you |we )?(?:respond|reply|speak)\b/i,
        /\bstep away before\b/i,
      ],
    },
  ];
  if (firstMatching(text, cooldownRules)) return 'cooldown_then_talk';

  const processRules = [
    {
      value: 'process_together',
      patterns: [
        /\btalk it through\b/i,
        /\btalks issues through\b/i,
        /\bprocess together\b/i,
        /\bcalm discussion\b/i,
        /\btalk it out calmly\b/i,
      ],
    },
  ];
  if (firstMatching(text, processRules)) return 'process_together';

  const repairDirectRules = [
    {
      value: 'repair_direct',
      patterns: [/\bdirect repair\b/i, /\bprefer(?:s|ring)? direct repair\b/i],
    },
  ];
  if (firstMatching(text, repairDirectRules)) return 'repair_direct';

  const repairBlameRules = [
    {
      value: 'repair_over_blame',
      patterns: [
        /\brepair over blame\b/i,
        /\bprefer(?:s|ring)? repair over blame\b/i,
        /\brepair rather than blame\b/i,
      ],
    },
  ];
  if (firstMatching(text, repairBlameRules)) return 'repair_over_blame';

  const avoidRules = [
    {
      value: 'avoids_conflict',
      patterns: [
        /\bno drama\b/i,
        /\bavoid(?:s|ing)? drama\b/i,
        /\bavoid(?:s|ing)? conflict\b/i,
        /\bconflict[- ]?avoidant\b/i,
        /\bhate(?:s)? arguing\b/i,
        /\bavoid(?:s|ing)? arguments?\b/i,
        /\bdon't like (?:to )?(?:fight|argue)\b/i,
        /\bnot into (?:fighting|drama)\b/i,
      ],
    },
  ];
  if (firstMatching(text, avoidRules)) return 'avoids_conflict';

  return null;
}

// ── Communication mode rules ──────────────────────────────────────────────────
// Signals preferred communication register. Priority order matters: more specific
// labels (`deep_talker`) are checked before broader ones (`verbal_expressive`).

const COMMUNICATION_MODE_RULES: { value: string; patterns: RegExp[] }[] = [
  {
    value: 'deep_talker',
    patterns: [
      /\bcould talk for hours\b/i,
      /\btalk for hours\b/i,
      /\blate[-\s]?night conversations\b/i,
      /\bphilosophical discussions\b/i,
      /\blove a good debate\b/i,
      /\bdeep conversations? (?:about|on|over)\b/i,
      /\blong conversations? about (?:life|everything|anything)\b/i,
    ],
  },
  {
    value: 'action_oriented',
    patterns: [
      /\bshow up (?:rather|instead of) (?:talking|words)\b/i,
      /\bactions? speak louder\b/i,
      /\bexpress (?:myself |love )?through actions?\b/i,
      /\bI show,? not tell\b/i,
      /\bdeeds,? not words\b/i,
      /\bshow(?:ing)? (?:up|love) through (?:actions?|doing)\b/i,
    ],
  },
  {
    value: 'reserved_opener',
    patterns: [
      /\btakes? time to open up\b/i,
      /\bslow to open up\b/i,
      /\bprivate person\b/i,
      /\bdon'?t share easily\b/i,
      /\bnot (?:very )?open right away\b/i,
      /\bguarded at first\b/i,
    ],
  },
  {
    value: 'text_heavy',
    patterns: [
      /\blove texting\b/i,
      /\bgood (?:at |with )?communication over text\b/i,
      /\btext a lot\b/i,
      /\bbetter over text\b/i,
      /\btext[-\s]?based communicator\b/i,
    ],
  },
  {
    value: 'verbal_expressive',
    patterns: [
      /\blove talking\b/i,
      /\bneed to (?:talk|express myself)\b/i,
      /\bvery expressive\b/i,
      /\bexpress (?:myself |my feelings )?(?:verbally|with words|through talking)\b/i,
      /\bopen communicator\b/i,
      /\bvery (?:communicative|verbal)\b/i,
    ],
  },
];

export function mapAutonomyTogethernessDepth(text: string): string | null {
  return firstMatchingEarliest(text, AUTONOMY_RULES);
}

export function mapConflictStyleDetail(text: string): string | null {
  return matchConflictStyleV2(text);
}

export function mapCommunicationMode(text: string): string | null {
  return firstMatching(text, COMMUNICATION_MODE_RULES);
}
