import { ProfileGender, UserProfileStatus } from '@prisma/client';
import {
  AcceptedPartnerGender,
  GenderIdentity,
} from '../canonical/matching-canonical.types';
import {
  buildProductProfileMatchingBridge,
  candidateMeetsViewerProductPartnerGenders,
  parseAcceptedPartnerGendersFromProductJson,
  reciprocalProductGenderEligibility,
} from './user-profile-matching-bridge.contract';

function minimalRow(
  overrides: Partial<{
    birthDate: Date | null;
    gender: ProfileGender;
    desiredPartnerGenders: unknown;
    city: string | null;
  }> = {},
) {
  return {
    birthDate: null as Date | null,
    // Default to PREFER_NOT_TO_SAY — mirrors the migration backfill for pre-existing rows.
    // gender is now NOT NULL in the schema; use explicit override in tests that need a specific value.
    gender: ProfileGender.PREFER_NOT_TO_SAY,
    desiredPartnerGenders: null as unknown,
    city: null as string | null,
    country: null as string | null,
    locationLabel: null as string | null,
    aboutMe: null as string | null,
    aboutPartner: null as string | null,
    aboutRelationship: null as string | null,
    ...overrides,
  };
}

describe('user-profile-matching-bridge.contract', () => {
  const asOf = new Date('2026-06-15T12:00:00.000Z');

  it('buildProductProfileMatchingBridge derives age and maps gender', () => {
    const row = minimalRow({
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: ProfileGender.FEMALE,
      desiredPartnerGenders: ['MALE', 'NON_BINARY'],
      city: 'TLV',
    });
    const b = buildProductProfileMatchingBridge(row, asOf);
    expect(b.version).toBe('product_profile_matching_bridge_v1');
    expect(b.derivedSelfAgeYears).toBe(36);
    expect(b.selfGender).toBe(GenderIdentity.FEMALE);
    expect(b.acceptedPartnerGenders).toEqual([
      AcceptedPartnerGender.MALE,
      AcceptedPartnerGender.NON_BINARY,
    ]);
    expect(b.location.city).toBe('TLV');
    expect(b.analysisText.aboutMe).toBeNull();
  });

  it('parseAcceptedPartnerGendersFromProductJson drops PREFER_NOT_TO_SAY and junk', () => {
    expect(
      parseAcceptedPartnerGendersFromProductJson([
        'MALE',
        'PREFER_NOT_TO_SAY',
        'nope',
      ]),
    ).toEqual([AcceptedPartnerGender.MALE]);
    expect(parseAcceptedPartnerGendersFromProductJson([])).toBeNull();
    expect(parseAcceptedPartnerGendersFromProductJson(null)).toBeNull();
  });

  it('candidateMeetsViewerProductPartnerGenders: empty viewer list does not filter', () => {
    expect(
      candidateMeetsViewerProductPartnerGenders(null, GenderIdentity.MALE),
    ).toBe(true);
    expect(
      candidateMeetsViewerProductPartnerGenders([], GenderIdentity.MALE),
    ).toBe(true);
  });

  it('candidateMeetsViewerProductPartnerGenders: explicit list rejects wrong gender', () => {
    const w = [AcceptedPartnerGender.FEMALE];
    expect(
      candidateMeetsViewerProductPartnerGenders(w, GenderIdentity.FEMALE),
    ).toBe(true);
    expect(
      candidateMeetsViewerProductPartnerGenders(w, GenderIdentity.MALE),
    ).toBe(false);
  });

  it('candidateMeetsViewerProductPartnerGenders: unknown candidate gender fails when list set', () => {
    const w = [AcceptedPartnerGender.MALE];
    expect(
      candidateMeetsViewerProductPartnerGenders(
        w,
        GenderIdentity.PREFER_NOT_TO_SAY,
      ),
    ).toBe(false);
    expect(candidateMeetsViewerProductPartnerGenders(w, null)).toBe(false);
  });

  it('reciprocalProductGenderEligibility requires both directions', () => {
    const aWant = [AcceptedPartnerGender.MALE];
    const bWant = [AcceptedPartnerGender.FEMALE];
    expect(
      reciprocalProductGenderEligibility(
        aWant,
        GenderIdentity.FEMALE,
        bWant,
        GenderIdentity.MALE,
      ),
    ).toBe(true);
    expect(
      reciprocalProductGenderEligibility(
        aWant,
        GenderIdentity.FEMALE,
        bWant,
        GenderIdentity.FEMALE,
      ),
    ).toBe(false);
  });

  it('UserProfile-shaped row can be passed (Pick compatibility)', () => {
    const row = {
      id: 'x',
      userId: 'u',
      status: UserProfileStatus.DRAFT,
      onboardingStep: 1,
      birthDate: new Date('2000-05-01T00:00:00.000Z'),
      gender: ProfileGender.NON_BINARY,
      desiredPartnerGenders: ['FEMALE'] as unknown,
      city: null,
      country: null,
      locationLabel: null,
      aboutMe: 'Hi',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const b = buildProductProfileMatchingBridge(row, asOf);
    expect(b.selfGender).toBe(GenderIdentity.NON_BINARY);
    expect(b.acceptedPartnerGenders).toEqual([AcceptedPartnerGender.FEMALE]);
    expect(b.analysisText.aboutMe).toBe('Hi');
  });
});
