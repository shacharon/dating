/**
 * Expansion explainability manifest — ordered SoT for chip labels, domains,
 * and shadow breakdown builders (Sprint 51 Story 02; Sprint 60 Story 3 config).
 *
 * Sprint 51 paired registries — shared expansion ids.
 * Add Expansion-N: see docs/sprints/ADD_EXPANSION_PLAYBOOK.md
 *   (1) prompt entry in extraction/expansion/expansion-manifest.ts
 *   (2) explainability: add row in expansion-explainability-config.ts;
 *       standard → thin shim; custom → builder file + manifest import.
 *
 * Do not paste per-expansion imports into match-explainability / assemble-result.
 */

import type { BreakdownEntry } from '../../../compatibility/compatibility-score';
import {
  buildExpansion01ShadowBreakdown,
  isExpansion01ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_01,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_01,
} from '../expansions/01-07/expansion-01-explainability';
import {
  buildExpansion02ShadowBreakdown,
  isExpansion02ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_02,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_02,
} from '../expansions/01-07/expansion-02-explainability';
import {
  buildExpansion03ShadowBreakdown,
  isExpansion03ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_03,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_03,
} from '../expansions/01-07/expansion-03-explainability';
import {
  buildExpansion04ShadowBreakdown,
  isExpansion04ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_04,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_04,
} from '../expansions/01-07/expansion-04-explainability';
import {
  buildExpansion05ShadowBreakdown,
  isExpansion05ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_05,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_05,
} from '../expansions/01-07/expansion-05-explainability';
import {
  buildExpansion06ShadowBreakdown,
  isExpansion06ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_06,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_06,
} from '../expansions/01-07/expansion-06-explainability';
import {
  buildExpansion07ShadowBreakdown,
  isExpansion07ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_07,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_07,
} from '../expansions/01-07/expansion-07-explainability';
import {
  buildExpansion10ShadowBreakdown,
  isExpansion10ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_10,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_10,
} from '../expansions/10-15/expansion-10-explainability';
import {
  buildExpansion11ShadowBreakdown,
  isExpansion11ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_11,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_11,
} from '../expansions/10-15/expansion-11-explainability';
import {
  buildExpansion12ShadowBreakdown,
  isExpansion12ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_12,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_12,
} from '../expansions/10-15/expansion-12-explainability';
import {
  buildExpansion13ShadowBreakdown,
  isExpansion13ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_13,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_13,
} from '../expansions/10-15/expansion-13-explainability';
import {
  buildExpansion14ShadowBreakdown,
  isExpansion14ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_14,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_14,
} from '../expansions/10-15/expansion-14-explainability';
import {
  buildExpansion15ShadowBreakdown,
  isExpansion15ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_15,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_15,
} from '../expansions/10-15/expansion-15-explainability';

export type ExpansionExplainabilityModule = {
  id: string;
  isShadowChipKey: (key: string) => boolean;
  positiveChipBySignal: Readonly<Record<string, string>>;
  signalDomain: Readonly<Record<string, string>>;
  buildShadowBreakdown: (
    signalsA: Record<string, number | null>,
    signalsB: Record<string, number | null>,
  ) => BreakdownEntry[];
};

/** Ordered SoT for chip / breakdown injection — append new expansions here only. */
export const EXPANSION_EXPLAINABILITY_MANIFEST: readonly ExpansionExplainabilityModule[] =
  [
    {
      id: 'expansion-01',
      isShadowChipKey: isExpansion01ShadowChipKey,
      positiveChipBySignal: CHIP_01,
      signalDomain: DOMAIN_01,
      buildShadowBreakdown: buildExpansion01ShadowBreakdown,
    },
    {
      id: 'expansion-02',
      isShadowChipKey: isExpansion02ShadowChipKey,
      positiveChipBySignal: CHIP_02,
      signalDomain: DOMAIN_02,
      buildShadowBreakdown: buildExpansion02ShadowBreakdown,
    },
    {
      id: 'expansion-03',
      isShadowChipKey: isExpansion03ShadowChipKey,
      positiveChipBySignal: CHIP_03,
      signalDomain: DOMAIN_03,
      buildShadowBreakdown: buildExpansion03ShadowBreakdown,
    },
    {
      id: 'expansion-04',
      isShadowChipKey: isExpansion04ShadowChipKey,
      positiveChipBySignal: CHIP_04,
      signalDomain: DOMAIN_04,
      buildShadowBreakdown: buildExpansion04ShadowBreakdown,
    },
    {
      id: 'expansion-05',
      isShadowChipKey: isExpansion05ShadowChipKey,
      positiveChipBySignal: CHIP_05,
      signalDomain: DOMAIN_05,
      buildShadowBreakdown: buildExpansion05ShadowBreakdown,
    },
    {
      id: 'expansion-06',
      isShadowChipKey: isExpansion06ShadowChipKey,
      positiveChipBySignal: CHIP_06,
      signalDomain: DOMAIN_06,
      buildShadowBreakdown: buildExpansion06ShadowBreakdown,
    },
    {
      id: 'expansion-07',
      isShadowChipKey: isExpansion07ShadowChipKey,
      positiveChipBySignal: CHIP_07,
      signalDomain: DOMAIN_07,
      buildShadowBreakdown: buildExpansion07ShadowBreakdown,
    },
    {
      id: 'expansion-10',
      isShadowChipKey: isExpansion10ShadowChipKey,
      positiveChipBySignal: CHIP_10,
      signalDomain: DOMAIN_10,
      buildShadowBreakdown: buildExpansion10ShadowBreakdown,
    },
    {
      id: 'expansion-11',
      isShadowChipKey: isExpansion11ShadowChipKey,
      positiveChipBySignal: CHIP_11,
      signalDomain: DOMAIN_11,
      buildShadowBreakdown: buildExpansion11ShadowBreakdown,
    },
    {
      id: 'expansion-12',
      isShadowChipKey: isExpansion12ShadowChipKey,
      positiveChipBySignal: CHIP_12,
      signalDomain: DOMAIN_12,
      buildShadowBreakdown: buildExpansion12ShadowBreakdown,
    },
    {
      id: 'expansion-13',
      isShadowChipKey: isExpansion13ShadowChipKey,
      positiveChipBySignal: CHIP_13,
      signalDomain: DOMAIN_13,
      buildShadowBreakdown: buildExpansion13ShadowBreakdown,
    },
    {
      id: 'expansion-14',
      isShadowChipKey: isExpansion14ShadowChipKey,
      positiveChipBySignal: CHIP_14,
      signalDomain: DOMAIN_14,
      buildShadowBreakdown: buildExpansion14ShadowBreakdown,
    },
    {
      id: 'expansion-15',
      isShadowChipKey: isExpansion15ShadowChipKey,
      positiveChipBySignal: CHIP_15,
      signalDomain: DOMAIN_15,
      buildShadowBreakdown: buildExpansion15ShadowBreakdown,
    },
  ];

export function isRegisteredExpansionShadowChipKey(key: string): boolean {
  return EXPANSION_EXPLAINABILITY_MANIFEST.some((m) => m.isShadowChipKey(key));
}

export function expansionChipLabelForKey(key: string): string | undefined {
  for (const m of EXPANSION_EXPLAINABILITY_MANIFEST) {
    if (m.isShadowChipKey(key)) return m.positiveChipBySignal[key];
  }
  return undefined;
}

export function expansionSignalDomainForKey(key: string): string | undefined {
  for (const m of EXPANSION_EXPLAINABILITY_MANIFEST) {
    if (m.isShadowChipKey(key)) return m.signalDomain[key];
  }
  return undefined;
}

export function buildAllExpansionShadowBreakdowns(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return EXPANSION_EXPLAINABILITY_MANIFEST.flatMap((m) =>
    m.buildShadowBreakdown(signalsA, signalsB),
  );
}
