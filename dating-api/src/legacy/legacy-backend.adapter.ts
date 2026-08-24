/**
 * QUARANTINE (Sprint 53 Story 02) — LAB / ADMIN ONLY.
 * Not a product HTTP surface. Product matches: /api/v1/me/*.
 * See docs/ops/LEGACY_HTTP_QUARANTINE.md. Scheduled for deletion (not this PR).
 *
 * HTTP consumers of this adapter (`/api/evaluate`, `/api/matches`) are lab-only.
 * The adapter itself remains for Nest DI until those routes are deleted.
 */
import { Injectable } from '@nestjs/common';
import { ContradictionService } from '../contradiction/contradiction.service';
import { EvaluateService } from '../evaluate/evaluate.service';
import { MatchesService } from '../matches/matches.service';
import { ProfilesJsonService } from '../profiles/profiles-json.service';

/**
 * Internal seam for legacy HTTP surfaces and offline scripts that still target the same
 * services as `GET/POST /api/matches`, `/api/evaluate`, `/api/contradiction`, and JSON profile IO.
 * Default wiring forwards to existing injectables with no behavior change.
 *
 * Expressed as an abstract class (not a TypeScript `interface`) so Nest can use it as a DI token.
 */
export abstract class LegacyBackendAdapter {
  abstract readonly matches: MatchesService;
  abstract readonly evaluate: EvaluateService;
  abstract readonly contradiction: ContradictionService;
  abstract readonly profilesJson: ProfilesJsonService;
}

@Injectable()
export class DefaultLegacyBackendAdapter extends LegacyBackendAdapter {
  constructor(
    public readonly matches: MatchesService,
    public readonly evaluate: EvaluateService,
    public readonly contradiction: ContradictionService,
    public readonly profilesJson: ProfilesJsonService,
  ) {
    super();
  }
}
