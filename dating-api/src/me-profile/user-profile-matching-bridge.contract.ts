/**
 * Phase 2.5 — Product `UserProfile` (DB `UserProductProfile`) → matching engine **bridge contract**.
 *
 * This module is **contract / mapping preparation only** for Phase 3:
 * - No engine runtime wiring here.
 * - No persistence or API changes implied.
 *
 * Phase 3 should import these types/helpers when building canonical preferences / retrieval
 * from the authenticated product profile row, alongside (not replacing) legacy analysis paths.
 */

import { ProfileGender, type Prisma, type UserProfile } from '@prisma/client';
import {
  AcceptedPartnerGender,
  GenderIdentity,
} from '../canonical/matching-canonical.types';

export const PRODUCT_PROFILE_MATCHING_BRIDGE_VERSION =
  'product_profile_matching_bridge_v1' as const;

/** Subset of `UserProfile` fields that participate in the bridge (documentation + typing). */
export type UserProfileMatchingBridgeSource = Pick<
  UserProfile,
  | 'birthDate'
  | 'gender'
  | 'desiredPartnerGenders'
  | 'city'
  | 'country'
  | 'locationLabel'
  | 'aboutMe'
  | 'aboutPartner'
  | 'aboutRelationship'
>;

const GENDER_IDENTITY_VALUES = new Set<string>(
  Object.values(GenderIdentity) as string[],
);

const ACCEPTED_PARTNER_VALUES = new Set<string>(
  Object.values(AcceptedPartnerGender) as string[],
);

/**
 * Normalized view derived from a product profile row for future engine / canonical mappers.
 *
 * Phase 3 consumes this shape (or equivalent) when translating `UserProfile` into:
 * - age / partner age-range sources,
 * - `GenderIdentity` facts,
 * - `preferences.acceptedPartnerGenders`,
 * - proximity inputs (after geocoding policy),
 * - free-text analysis inputs for structured extraction.
 */
export interface ProductProfileMatchingBridge {
  readonly version: typeof PRODUCT_PROFILE_MATCHING_BRIDGE_VERSION;
  /** Stored birth instant; age policy (timezone, rounding) is Phase 3. */
  readonly selfBirthDate: Date | null;
  /**
   * Whole years from `selfBirthDate` to `asOf` (floor). `null` if birth unknown or invalid.
   * Partner age **bounds** are not on the product row yet; Phase 3 derives them from product + policy.
   */
  readonly derivedSelfAgeYears: number | null;
  /** Canonical self gender when `UserProfile.gender` is set. */
  readonly selfGender: GenderIdentity | null;
  /**
   * Canonical strict partner-gender acceptance derived from `desiredPartnerGenders` JSON.
   * `null` when unset or empty → **no** partner-gender filter from this product field alone.
   */
  readonly acceptedPartnerGenders: readonly AcceptedPartnerGender[] | null;
  /** Opaque strings until geocoding / proximity rules exist in Phase 3. */
  readonly location: {
    readonly city: string | null;
    readonly country: string | null;
    readonly locationLabel: string | null;
  };
  /** Free text fed into analysis / legacy-style structured pipelines (not engine facts yet). */
  readonly analysisText: {
    readonly aboutMe: string | null;
    readonly aboutPartner: string | null;
    readonly aboutRelationship: string | null;
  };
}

function parseProfileGender(value: unknown): ProfileGender | null {
  if (typeof value !== 'string') {
    return null;
  }
  return (Object.values(ProfileGender) as string[]).includes(value)
    ? (value as ProfileGender)
    : null;
}

function profileGenderToGenderIdentity(g: ProfileGender): GenderIdentity | null {
  if (!GENDER_IDENTITY_VALUES.has(g)) {
    return null;
  }
  return g as GenderIdentity;
}

/**
 * Maps stored JSON (`ProfileGender[]` as JSON) to canonical `AcceptedPartnerGender[]`.
 * Drops unknown strings and `PREFER_NOT_TO_SAY` (not a partner filter in canonical prefs).
 */
export function parseAcceptedPartnerGendersFromProductJson(
  raw: Prisma.JsonValue | null,
): readonly AcceptedPartnerGender[] | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: AcceptedPartnerGender[] = [];
  for (const x of raw) {
    if (typeof x !== 'string') {
      continue;
    }
    if (x === ProfileGender.PREFER_NOT_TO_SAY) {
      continue;
    }
    if (ACCEPTED_PARTNER_VALUES.has(x)) {
      out.push(x as AcceptedPartnerGender);
    }
  }
  return out.length > 0 ? out : null;
}

function wholeYearsBetween(from: Date, asOf: Date): number {
  let years = asOf.getUTCFullYear() - from.getUTCFullYear();
  const m = asOf.getUTCMonth() - from.getUTCMonth();
  if (m < 0 || (m === 0 && asOf.getUTCDate() < from.getUTCDate())) {
    years -= 1;
  }
  return years;
}

function deriveAgeYears(birthDate: Date | null, asOf: Date): number | null {
  if (!birthDate) {
    return null;
  }
  const t = birthDate.getTime();
  if (Number.isNaN(t) || birthDate.getTime() > asOf.getTime()) {
    return null;
  }
  return wholeYearsBetween(birthDate, asOf);
}

/**
 * Pure bridge: Prisma `UserProfile` slice → `ProductProfileMatchingBridge`.
 * `asOf` is the policy clock for age (Phase 3 should inject a single clock per request/job).
 */
export function buildProductProfileMatchingBridge(
  row: UserProfileMatchingBridgeSource,
  asOf: Date,
): ProductProfileMatchingBridge {
  const g = row.gender ? parseProfileGender(row.gender) : null;
  const selfGender = g ? profileGenderToGenderIdentity(g) : null;

  return {
    version: PRODUCT_PROFILE_MATCHING_BRIDGE_VERSION,
    selfBirthDate: row.birthDate ?? null,
    derivedSelfAgeYears: deriveAgeYears(row.birthDate ?? null, asOf),
    selfGender,
    acceptedPartnerGenders: parseAcceptedPartnerGendersFromProductJson(
      row.desiredPartnerGenders ?? null,
    ),
    location: {
      city: row.city ?? null,
      country: row.country ?? null,
      locationLabel: row.locationLabel ?? null,
    },
    analysisText: {
      aboutMe: row.aboutMe ?? null,
      aboutPartner: row.aboutPartner ?? null,
      aboutRelationship: row.aboutRelationship ?? null,
    },
  };
}

function toAcceptedPartnerGenderOrNull(
  self: GenderIdentity | null,
): AcceptedPartnerGender | null {
  if (self === null) {
    return null;
  }
  const selfStr = self as string;
  for (const v of Object.values(AcceptedPartnerGender)) {
    if (v === selfStr) {
      return v;
    }
  }
  return null;
}

/**
 * ## Gender-aware eligibility (product `desiredPartnerGenders` → no mismatched recs)
 *
 * **Viewer → candidate (one direction):**
 * - Let `W` be the viewer’s `acceptedPartnerGenders` from {@link buildProductProfileMatchingBridge}
 *   (non-null, non-empty ⇒ user expressed an explicit partner-gender set).
 * - Let `g` be the candidate’s self gender as {@link GenderIdentity} (from product or canonical facts in Phase 3).
 * - If `W` is **null or empty**: this rule does **not** restrict by partner genders from the product field.
 * - If `W` is **non-empty** and `g` is **null** or not representable as {@link AcceptedPartnerGender}:
 *   the candidate is **ineligible** for that viewer (do not surface as a gender-allowed match).
 * - If `W` is **non-empty** and `g` maps to {@link AcceptedPartnerGender}: the candidate is eligible **only if**
 *   that value is **in `W`**.
 *
 * **Reciprocal recommendations:** apply the same predicate in **both** directions (A→B and B→A);
 * a pair is acceptable only if both directions pass.
 */
export function candidateMeetsViewerProductPartnerGenders(
  viewerAcceptedPartnerGenders: readonly AcceptedPartnerGender[] | null,
  candidateSelfGender: GenderIdentity | null,
): boolean {
  if (!viewerAcceptedPartnerGenders?.length) {
    return true;
  }
  const candidate = toAcceptedPartnerGenderOrNull(candidateSelfGender);
  if (candidate === null) {
    return false;
  }
  return viewerAcceptedPartnerGenders.includes(candidate);
}

/** Both directions pass the product-derived partner-gender gate (strict reciprocal filter). */
export function reciprocalProductGenderEligibility(
  aAccepted: readonly AcceptedPartnerGender[] | null,
  aSelf: GenderIdentity | null,
  bAccepted: readonly AcceptedPartnerGender[] | null,
  bSelf: GenderIdentity | null,
): boolean {
  return (
    candidateMeetsViewerProductPartnerGenders(aAccepted, bSelf) &&
    candidateMeetsViewerProductPartnerGenders(bAccepted, aSelf)
  );
}
