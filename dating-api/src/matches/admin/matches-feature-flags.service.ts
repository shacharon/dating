import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENABLE_HG_COMPARE_DIAGNOSTIC_ENV } from '../holy-grail/hg-compare-diagnostic.constants';
import { ENABLE_HG_LIST_ADMISSION_GATE_ENV } from '../holy-grail/hg-list-admission-gate.constants';
import { parseHgListAdmissionGateEnv } from '../holy-grail/hg-list-admission-gate';

@Injectable()
export class MatchesFeatureFlagsService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Env `ENABLE_HG_COMPARE_DIAGNOSTIC` = `1` or `true` (case-insensitive) enables POST compare/hg-diagnostic.
   */
  isHgCompareDiagnosticEnabled(): boolean {
    const v =
      this.config.get<string>(ENABLE_HG_COMPARE_DIAGNOSTIC_ENV) ??
      process.env[ENABLE_HG_COMPARE_DIAGNOSTIC_ENV];
    const s = (v ?? '').trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes';
  }

  /**
   * Env `ENABLE_HG_LIST_ADMISSION_GATE` = `1` / `true` / `yes` (case-insensitive). When on, list membership drops only
   * rows that expose a **valid** HG wire triple with `hgMutualPass === false`. Rows with **no** valid triple are **kept**
   * (lenient fallback). Off = no HG membership filter (still `HG_GATE_LEGACY_RANK_V1` legacy sort only).
   */
  isHgListAdmissionGateEnabled(): boolean {
    return parseHgListAdmissionGateEnv(
      this.config.get<string>(ENABLE_HG_LIST_ADMISSION_GATE_ENV),
      process.env[ENABLE_HG_LIST_ADMISSION_GATE_ENV],
    );
  }
}
