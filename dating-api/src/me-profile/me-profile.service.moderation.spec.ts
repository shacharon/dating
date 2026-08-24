/**
 * Sub-split from me-profile.service.spec.ts (Sprint 69 Story 03).
 * content moderation gate
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as contentModerationTypes from '../content-moderation/content-moderation.types';
import {
  createMeProfileServiceTestContext,
  type MeProfileServiceTestContext,
} from './me-profile.service.spec-support';
import type { MeProfileService } from './profile/me-profile.service';

describe('MeProfileService — moderation', () => {
  let service: MeProfileService;
  let prisma: MeProfileServiceTestContext['prisma'];
  let userId: string;
  let baseRow: MeProfileServiceTestContext['baseRow'];
  let profileRow: MeProfileServiceTestContext['profileRow'];
  let moderation: MeProfileServiceTestContext['moderation'];
  let contentViolations: MeProfileServiceTestContext['contentViolations'];

  beforeEach(() => {
    ({
      service,
      prisma,
      userId,
      baseRow,
      profileRow,
      moderation,
      contentViolations,
    } = createMeProfileServiceTestContext());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('content moderation gate (Sprint 30 Story 2)', () => {
    it('throws BadRequest when aboutMe is flagged and records violation', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);
      moderation.checkContent.mockResolvedValue({
        flagged: true,
        categories: ['sexual'],
        primaryCategory: 'sexual',
        score: 0.9,
        sexualScore: null,
        failOpen: false,
      });

      try {
        await service.createForUser(userId, { aboutMe: 'explicit text' });
        fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).getResponse()).toMatchObject({
          error: 'content_moderation_failed',
          details: {
            field: 'aboutMe',
            category: 'sexual',
            source: 'openai',
            flaggedText: 'explicit text',
            flaggedTextIndex: 0,
            flaggedTextLength: 'explicit text'.length,
            reason: 'Contains explicit sexual content',
            suggestion: expect.stringContaining('rephrase'),
          },
        });
        expect(
          (e as BadRequestException).getResponse() as Record<string, unknown>,
        ).not.toMatchObject({
          details: expect.objectContaining({ score: expect.anything() }),
        });
      }

      expect(contentViolations.recordViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          surface: 'profile_aboutMe',
          flaggedText: 'explicit text',
          category: 'sexual',
          action: 'blocked',
        }),
      );
      expect(contentViolations.enforceViolationThreshold).toHaveBeenCalledWith(
        userId,
        'profile',
      );
      expect(prisma.userProfile.create).not.toHaveBeenCalled();
    });

    it('throws BadRequest for dating blocklist when OpenAI does not flag', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);
      moderation.checkContent.mockResolvedValue({
        flagged: false,
        categories: [],
        primaryCategory: null,
        score: 0.1,
        sexualScore: 0.1,
        failOpen: false,
      });

      try {
        await service.createForUser(userId, { aboutMe: 'wanna fuck' });
        fail('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).getResponse()).toMatchObject({
          error: 'content_moderation_failed',
          details: expect.objectContaining({
            field: 'aboutMe',
            source: 'dating_blocklist',
            category: 'dating_policy',
            flaggedText: expect.stringMatching(/wanna fuck/i),
            reason: 'Direct sexual solicitation',
            exampleAlternative: expect.stringContaining('adventurous'),
          }),
        });
      }

      expect(contentViolations.recordViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          surface: 'profile_aboutMe',
          category: 'dating_policy',
          action: 'blocked',
        }),
      );
      expect(prisma.userProfile.create).not.toHaveBeenCalled();
    });

    it('sets profile_edit_blocked on 3rd profile violation', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(profileRow(baseRow));
      moderation.checkContent.mockResolvedValue({
        flagged: true,
        categories: ['hate'],
        primaryCategory: 'hate',
        score: 0.8,
        sexualScore: null,
        failOpen: false,
      });
      contentViolations.enforceViolationThreshold.mockResolvedValue({
        shouldBlock: true,
        reason: '3_profile_violations',
      });

      await expect(
        service.patchForUser(userId, { aboutPartner: 'bad' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(contentViolations.enforceViolationThreshold).toHaveBeenCalledWith(
        userId,
        'profile',
      );
      expect(prisma.userProfile.update).not.toHaveBeenCalled();
    });

    it('throws Forbidden when user is already profile_edit_blocked', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(profileRow(baseRow));
      contentViolations.isUserBlocked.mockResolvedValue(true);

      await expect(
        service.patchForUser(userId, { aboutMe: 'anything' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(moderation.checkContent).not.toHaveBeenCalled();
      expect(prisma.userProfile.update).not.toHaveBeenCalled();
    });

    it('allows save when moderation fail-opens', async () => {
      const created = { ...baseRow, aboutMe: 'maybe false positive' };
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...created,
          desiredPartnerGenders: created.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(profileRow(created));
      prisma.userProfile.create.mockResolvedValue(created);
      moderation.checkContent.mockResolvedValue({
        flagged: false,
        categories: [],
        primaryCategory: null,
        score: 0,
        sexualScore: null,
        failOpen: true,
      });

      await expect(
        service.createForUser(userId, { aboutMe: 'maybe false positive' }),
      ).resolves.toMatchObject({ aboutMe: 'maybe false positive' });
      expect(contentViolations.recordViolation).not.toHaveBeenCalled();
      expect(prisma.userProfile.create).toHaveBeenCalled();
    });

    it('skips moderation when feature flag is off', async () => {
      jest
        .spyOn(contentModerationTypes, 'isContentModerationEnabled')
        .mockReturnValue(false);
      const created = { ...baseRow, aboutMe: 'unchecked' };
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...created,
          desiredPartnerGenders: created.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(profileRow(created));
      prisma.userProfile.create.mockResolvedValue(created);

      await service.createForUser(userId, { aboutMe: 'unchecked' });

      expect(contentViolations.getUserViolationStatus).not.toHaveBeenCalled();
      expect(contentViolations.isUserBlocked).not.toHaveBeenCalled();
      expect(moderation.checkContent).not.toHaveBeenCalled();
      expect(prisma.userProfile.create).toHaveBeenCalled();
    });

    it('skips empty/whitespace about fields without calling moderation', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(profileRow(baseRow))
        .mockResolvedValueOnce({
          ...baseRow,
          aboutMe: null,
          desiredPartnerGenders: baseRow.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(profileRow({ ...baseRow, aboutMe: null }));
      prisma.userProfile.update.mockResolvedValue({
        ...baseRow,
        aboutMe: null,
      });

      await service.patchForUser(userId, { aboutMe: '   ' });

      expect(moderation.checkContent).not.toHaveBeenCalled();
    });
  });
});
