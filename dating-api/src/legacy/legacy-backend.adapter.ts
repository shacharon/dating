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
