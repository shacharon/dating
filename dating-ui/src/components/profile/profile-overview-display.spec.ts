import { describe, it, expect } from 'vitest';
import {
  galleryDotKinds,
  overviewLocationLine,
  overviewPartnerLine,
  overviewTitleLine,
  pickHeroPhoto,
} from '@/components/profile/profile-overview-display';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import type { MeProfilePhotoDto } from '@/lib/api/me-photos-api';

function draft(partial: Partial<ProfileDraft>): ProfileDraft {
  return {
    nickname: '',
    aboutMe: '',
    aboutPartner: '',
    aboutRelationship: '',
    birthDate: '',
    gender: '',
    desiredPartnerGenders: [],
    city: '',
    country: '',
    locationLabel: '',
    ...partial,
  };
}

function photo(
  partial: Partial<MeProfilePhotoDto> & Pick<MeProfilePhotoDto, 'id' | 'status'>,
): MeProfilePhotoDto {
  return {
    profileId: 'pr',
    storageKey: 'k',
    originalFileName: null,
    mimeType: 'image/jpeg',
    sizeBytes: 1,
    position: 0,
    isPrimary: false,
    moderationProvider: null,
    moderationResultJson: null,
    rejectionReason: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('profile-overview-display', () => {
  it('builds title with age', () => {
    expect(
      overviewTitleLine(draft({ nickname: 'Ada', birthDate: '1990-06-15' })),
    ).toMatch(/^Ada, \d+$/);
  });

  it('prefers locationLabel over city', () => {
    expect(
      overviewLocationLine(
        draft({ locationLabel: 'TLV', city: 'Tel Aviv' }),
      ),
    ).toBe('TLV');
  });

  it('formats partner genders', () => {
    expect(
      overviewPartnerLine(['MAN', 'WOMAN'], {
        MAN: 'Male',
        WOMAN: 'Female',
        NON_BINARY: 'Non-binary',
      } as never),
    ).toBe('Male, Female');
  });

  it('picks primary then approved photo', () => {
    const list = [
      photo({ id: 'a', status: 'PENDING', position: 0 }),
      photo({ id: 'b', status: 'APPROVED', isPrimary: true, position: 1 }),
    ];
    expect(pickHeroPhoto(list)?.id).toBe('b');
  });

  it('maps gallery dots for three slots', () => {
    expect(
      galleryDotKinds([
        photo({ id: '1', status: 'APPROVED', position: 0 }),
        photo({ id: '2', status: 'PENDING', position: 1 }),
      ]),
    ).toEqual(['approved', 'pending', 'empty']);
  });
});
