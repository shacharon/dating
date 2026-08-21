/**
 * Sprint 52 keyword engine: enrichment-v2 (structural split — Sprint 57 Story 02)
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN — docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 *
 * This module: dailyRhythm / kidsTimeline / relationshipPace rule tables + mappers.
 */

import { firstMatching } from './enrichment-keyword-helpers';

const DAILY_RHYTHM_RULES: { value: string; patterns: RegExp[] }[] = [
  {
    value: 'early_extreme',
    patterns: [/\b4\s*am\b/i, /\b4am\b/i, /\bearly kitchen\b/i],
  },
  {
    value: 'irregular',
    patterns: [
      /\bnight shifts?\b/i,
      /\bnight[-\s]?shift\b/i,
      /\brotation(?:al)?\b/i,
      /\btravel[-\s]?heavy\b/i,
      /\btravel heavy\b/i,
      /\btwo weeks on\b/i,
      /\bon[-\s]call\b/i,
    ],
  },
  {
    value: 'social_bursts_recharge',
    patterns: [
      /\bsocial bursts?\b/i,
      /\balternating social\b/i,
      /\bsocial bursts? and recharge\b/i,
    ],
  },
  {
    value: 'slow_mornings',
    patterns: [/\bslow mornings?\b/i, /\bslow sundays?\b/i],
  },
  {
    value: 'late',
    patterns: [/\bnight owl\b/i, /\blate nights?\b/i, /\bup late\b/i],
  },
  {
    value: 'early_bird',
    patterns: [
      /\bearly bird\b/i,
      /\bearly riser\b/i,
      /\bmorning person\b/i,
      /\bbefore sunrise\b/i,
      /\bbefore dawn\b/i,
      /\bruns? before (?:sunrise|dawn)\b/i,
      /\brunning before (?:sunrise|dawn)\b/i,
      /\bup before (?:the )?sun\b/i,
    ],
  },
  {
    value: 'stable_nine_to_five',
    patterns: [/\bstable 9-5\b/i, /\b9-5\b/i, /\bnine[-\s]?to[-\s]?five\b/i],
  },
  {
    value: 'fast_paced',
    patterns: [
      /\bvery fast lifestyle\b/i,
      /\bfast[-\s]?paced\b/i,
      /\bfast pace\b/i,
    ],
  },
  {
    value: 'homebody',
    patterns: [
      /\bhomebody\b/i,
      /\bstay in most nights\b/i,
      /\bquiet nights in\b/i,
    ],
  },
  {
    value: 'startup_grind',
    patterns: [/\bstartup grind\b/i, /\bgrind mode\b/i],
  },
  {
    value: 'location_flexible',
    patterns: [
      /\bdigital nomad\b/i,
      /\bwork(?:ing)? remotely\b/i,
      /\bfull(?:y)? remote\b/i,
      /,\s*remote\b/i,
      /\bnot tied to one place\b/i,
      /\blived in (?:several|three|two|four|five|\d+)\s+countries\b/i,
    ],
  },
  {
    value: 'quiet_evenings',
    patterns: [
      /\bnot into nightlife\b/i,
      /\bavoid(?:ing)? nightlife\b/i,
      /\bno nightlife\b/i,
    ],
  },
];

const KIDS_RULES: { value: string; patterns: RegExp[] }[] = [
  {
    value: 'childfree',
    patterns: [
      /\bchildfree\b/i,
      /\bdon't want kids\b/i,
      /\bdo not want (kids|children)\b/i,
      /\bno plans for kids\b/i,
    ],
  },
  {
    value: 'wants_kids_soon',
    patterns: [
      /\bwants? kids soon\b/i,
      /\bkids soon\b/i,
      /\bwant (a )?baby soon\b/i,
      /\bwant kids soon\b/i,
    ],
  },
  {
    value: 'open_timeline',
    patterns: [
      /\bopen to kids\b/i,
      /\bmaybe kids\b/i,
      /\bflexible on kids\b/i,
      /\bflexible on (?:the )?timeline\b/i,
      /\bopen on kids timeline\b/i,
      /\bflexible on kids timeline\b/i,
    ],
  },
  {
    value: 'wants_kids',
    patterns: [
      /\bwants? children\b/i,
      /\bfamily oriented\b/i,
      /\bfamily-oriented\b/i,
      /\bwants? (a )?family\b/i,
      /\bready for kids\b/i,
      /\bfamily planning\b/i,
      /\bwants kids is\b/i,
    ],
  },
  {
    value: 'already_has_kids',
    patterns: [
      /\balready have (kids|children)\b/i,
      /\balready has kids\b/i,
      /\bsingle parent\b/i,
      /\bcoparent\b/i,
      /\bhave two kids\b/i,
      /\bdivorced dad\b/i,
      /\bdivorced mom\b/i,
    ],
  },
];

// ── Relationship pace rules ───────────────────────────────────────────────────
// Signals how quickly someone wants to move through relationship milestones.
// Uses `firstMatching` (first rule wins); high-precision phrases only.

const RELATIONSHIP_PACE_RULES: { value: string; patterns: RegExp[] }[] = [
  {
    value: 'fast_mover',
    patterns: [
      /\bnot looking for a pen pal\b/i,
      /\bready to settle down\b/i,
      /\bwant(?:ing)? to meet (?:soon|quickly|right away)\b/i,
      /\bno more back and forth\b/i,
      /\bnot here for pen pals\b/i,
      /\bready to take the next step\b/i,
      /\bwant(?:s|ing)? to move forward\b/i,
      /\bnot interested in (?:casual|long[-\s]?drawn[-\s]?out)\b/i,
    ],
  },
  {
    value: 'slow_build',
    patterns: [
      /\btake things (?:very )?slow(?:ly)?\b/i,
      /\bprefer(?:ring)? a slow build\b/i,
      /\bslow burn\b/i,
      /\bneed time to (?:really )?get to know\b/i,
      /\bbuild (?:things |it )?(?:slowly|gradually)\b/i,
      /\bgo slow\b/i,
    ],
  },
  {
    value: 'no_rush_explicit',
    patterns: [
      /\bno rush\b/i,
      /\bnot in a(?:ny)? hurry\b/i,
      /\btake things at (?:our|my) own pace\b/i,
      /\bno pressure\b/i,
      /\bwhenever it feels right\b/i,
      /\bat (?:our|a) natural pace\b/i,
    ],
  },
  {
    value: 'measured_pace',
    patterns: [
      /\bsee where things go\b/i,
      /\blet things (?:develop|unfold|progress) naturally\b/i,
      /\btake it one step at a time\b/i,
      /\bnot rushing but (?:I'm |I am )?serious\b/i,
      /\btake it as it comes\b/i,
      /\blet it flow naturally\b/i,
    ],
  },
];

export function mapDailyRhythm(text: string): string | null {
  return firstMatching(text, DAILY_RHYTHM_RULES);
}

export function mapKidsTimeline(text: string): string | null {
  return firstMatching(text, KIDS_RULES);
}

export function mapRelationshipPace(text: string): string | null {
  return firstMatching(text, RELATIONSHIP_PACE_RULES);
}
