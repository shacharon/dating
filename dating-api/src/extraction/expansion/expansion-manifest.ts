/**
 * Expansion prompt manifest — ordered SoT for injecting shadow / interest
 * blocks into extraction system prompts (Sprint 51 Story 01).
 *
 * Sprint 51 paired registries — shared expansion ids.
 * Add Expansion-N: see docs/sprints/ADD_EXPANSION_PLAYBOOK.md
 *   (1) prompt entry here
 *   (2) explainability entry in matches/expansion-explainability-manifest.ts
 *       when chips/breakdown exist.
 *
 * Adding a shadow expansion: new module file + one entry here.
 * Do not edit extraction.service.ts prompt splices for new expansions.
 */

import { EXPANSION_01_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-01-signal-definitions';
import { EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-02-signal-definitions';
import { EXPANSION_03_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-03-signal-definitions';
import { EXPANSION_04_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-04-signal-definitions';
import { EXPANSION_05_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-05-signal-definitions';
import { EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-06-signal-definitions';
import {
  EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-07-signal-definitions';
import {
  EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-08-signal-definitions';
import { EXPANSION_09_INTEREST_GUIDANCE_BLOCK } from './expansion-09-interest-guidance';
import {
  EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-10-signal-definitions';
import {
  EXPANSION_11_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_11_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-11-signal-definitions';
import {
  EXPANSION_12_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_12_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-12-signal-definitions';
import {
  EXPANSION_13_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_13_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-13-signal-definitions';
import {
  EXPANSION_14_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_14_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-14-signal-definitions';
import {
  EXPANSION_15_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_15_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-15-signal-definitions';

export type ExpansionPromptModule = {
  /** Stable id, e.g. 'expansion-01' | 'expansion-09' */
  id: string;
  /** Injected into SELF_EXTRACTOR_PROMPT shadow section (ordered). */
  selfShadowBlock?: string;
  /** Injected into PARTNER_EXTRACTOR_PROMPT shadow section (ordered). */
  partnerShadowBlock?: string;
  /** Injected into INTERESTS sections (self / relationship / partner). */
  interestGuidanceBlock?: string;
};

/** Ordered SoT for prompt injection — append new expansions here only. */
export const EXPANSION_PROMPT_MANIFEST: readonly ExpansionPromptModule[] = [
  { id: 'expansion-01', selfShadowBlock: EXPANSION_01_SELF_SHADOW_SIGNAL_BLOCK },
  { id: 'expansion-02', selfShadowBlock: EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK },
  { id: 'expansion-03', selfShadowBlock: EXPANSION_03_SELF_SHADOW_SIGNAL_BLOCK },
  { id: 'expansion-04', selfShadowBlock: EXPANSION_04_SELF_SHADOW_SIGNAL_BLOCK },
  { id: 'expansion-05', selfShadowBlock: EXPANSION_05_SELF_SHADOW_SIGNAL_BLOCK },
  { id: 'expansion-06', selfShadowBlock: EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK },
  {
    id: 'expansion-07',
    selfShadowBlock: EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK,
    partnerShadowBlock: EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK,
  },
  {
    id: 'expansion-08',
    selfShadowBlock: EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK,
    partnerShadowBlock: EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK,
  },
  {
    id: 'expansion-09',
    interestGuidanceBlock: EXPANSION_09_INTEREST_GUIDANCE_BLOCK,
  },
  {
    id: 'expansion-10',
    selfShadowBlock: EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK,
    partnerShadowBlock: EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK,
  },
  {
    id: 'expansion-11',
    selfShadowBlock: EXPANSION_11_SELF_SHADOW_SIGNAL_BLOCK,
    partnerShadowBlock: EXPANSION_11_PARTNER_SHADOW_SIGNAL_BLOCK,
  },
  {
    id: 'expansion-12',
    selfShadowBlock: EXPANSION_12_SELF_SHADOW_SIGNAL_BLOCK,
    partnerShadowBlock: EXPANSION_12_PARTNER_SHADOW_SIGNAL_BLOCK,
  },
  {
    id: 'expansion-13',
    selfShadowBlock: EXPANSION_13_SELF_SHADOW_SIGNAL_BLOCK,
    partnerShadowBlock: EXPANSION_13_PARTNER_SHADOW_SIGNAL_BLOCK,
  },
  {
    id: 'expansion-14',
    selfShadowBlock: EXPANSION_14_SELF_SHADOW_SIGNAL_BLOCK,
    partnerShadowBlock: EXPANSION_14_PARTNER_SHADOW_SIGNAL_BLOCK,
  },
  {
    id: 'expansion-15',
    selfShadowBlock: EXPANSION_15_SELF_SHADOW_SIGNAL_BLOCK,
    partnerShadowBlock: EXPANSION_15_PARTNER_SHADOW_SIGNAL_BLOCK,
  },
];

function joinBlocks(
  pick: (m: ExpansionPromptModule) => string | undefined,
): string {
  return EXPANSION_PROMPT_MANIFEST.map(pick)
    .filter((b): b is string => typeof b === 'string' && b.length > 0)
    .join('\n\n');
}

export function joinExpansionSelfShadowBlocks(): string {
  return joinBlocks((m) => m.selfShadowBlock);
}

export function joinExpansionPartnerShadowBlocks(): string {
  return joinBlocks((m) => m.partnerShadowBlock);
}

export function joinExpansionInterestGuidanceBlocks(): string {
  return joinBlocks((m) => m.interestGuidanceBlock);
}
