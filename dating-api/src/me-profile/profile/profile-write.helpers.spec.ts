import { UnprocessableEntityException } from '@nestjs/common';
import { UserProfileOnboardingStep } from '@prisma/client';
import { assertOnboardingStepCoherent } from './profile-write.helpers';

describe('assertOnboardingStepCoherent', () => {
  it('allows COMPLETED with empty story texts when partners exist on profile', () => {
    expect(() =>
      assertOnboardingStepCoherent(
        {
          desiredPartnerGenders: ['FEMALE'],
          aboutMe: null,
          aboutPartner: null,
          aboutRelationship: null,
        } as never,
        { onboardingStep: UserProfileOnboardingStep.COMPLETED },
      ),
    ).not.toThrow();
  });

  it('rejects COMPLETED without partner genders', () => {
    try {
      assertOnboardingStepCoherent(
        {
          desiredPartnerGenders: null,
          aboutMe: null,
          aboutPartner: null,
          aboutRelationship: null,
        } as never,
        { onboardingStep: UserProfileOnboardingStep.COMPLETED },
      );
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(UnprocessableEntityException);
      expect((e as UnprocessableEntityException).getResponse()).toMatchObject({
        error: 'onboarding_partner_genders_required',
      });
    }
  });

  it('rejects TEXTS without partner genders', () => {
    try {
      assertOnboardingStepCoherent(null, {
        onboardingStep: UserProfileOnboardingStep.TEXTS,
      });
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(UnprocessableEntityException);
      expect((e as UnprocessableEntityException).getResponse()).toMatchObject({
        error: 'onboarding_partner_genders_required',
      });
    }
  });

  it('allows BASIC without partners or texts', () => {
    expect(() =>
      assertOnboardingStepCoherent(null, {
        onboardingStep: UserProfileOnboardingStep.BASIC,
      }),
    ).not.toThrow();
  });
});
