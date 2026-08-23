import type {
  ChildrenUnsureDirectionsDto,
  HolyGrailMatchDiagnosticsDto,
  MatchRecordDto,
} from './match.types';

export interface ListMatchesOptions {
  readonly hideChildrenUnsure?: boolean;
}

export interface CompareBodyDto {
  aId: string;
  bId: string;
}

export interface CompareGuardMatchDto {
  matchId: string;
  aId: string;
  bId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  status: 'NOT_ANALYZED' | 'INSUFFICIENT_DATA';
  message: string;
  compatibility: null;
  partnerFit: null;
  relationshipFit: null;
  coverage: null;
  friction: null;
  finalScore: null;
}

export type CompareServiceResult =
  | { status: 'READY'; matchId: string; match: MatchRecordDto }
  | { status: 'NOT_ANALYZED'; matchId: string; match: CompareGuardMatchDto }
  | {
      status: 'INSUFFICIENT_DATA';
      matchId: string;
      match: CompareGuardMatchDto;
    };

/** HG-only diagnostic compare: no legacy engine, no ProfileExtractionV2 gate. */
export type CompareHgDiagnosticSuccess = {
  readonly ok: true;
  readonly matchId: string;
  readonly aId: string;
  readonly bId: string;
  readonly evaluatedAt: string;
  /** Live HG resolution; pair snapshot table removed (Migration 3). */
  readonly source: 'live_hg_eval_only';
  readonly a: { readonly id: string; readonly name: string };
  readonly b: { readonly id: string; readonly name: string };
  readonly children_unsure: ChildrenUnsureDirectionsDto;
  readonly holyGrail: HolyGrailMatchDiagnosticsDto;
};

export type CompareHgDiagnosticFailure = {
  readonly ok: false;
  readonly matchId: string;
  readonly aId: string;
  readonly bId: string;
  readonly evaluatedAt: string;
  readonly reason: 'HG_EVAL_UNAVAILABLE';
  readonly message: string;
  readonly a: { readonly id: string; readonly name: string };
  readonly b: { readonly id: string; readonly name: string };
};

export type CompareHgDiagnosticResult =
  | CompareHgDiagnosticSuccess
  | CompareHgDiagnosticFailure;
