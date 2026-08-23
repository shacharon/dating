import {
  candidateHasApprovedPhoto,
  countApprovedPhotosForProfile,
  viewerHasApprovedPhoto,
} from './me-profile-photo-gate';

describe('me-profile-photo-gate', () => {
  const profileId = 'prof_gate_1';

  it('countApprovedPhotosForProfile queries APPROVED rows only', async () => {
    const count = jest.fn().mockResolvedValue(2);
    const matches = { countApprovedPhotosForProfile: count };

    await expect(
      countApprovedPhotosForProfile(matches, profileId),
    ).resolves.toBe(2);

    expect(count).toHaveBeenCalledWith(profileId);
  });

  it('viewerHasApprovedPhoto returns false when count is 0', async () => {
    const matches = {
      countApprovedPhotosForProfile: jest.fn().mockResolvedValue(0),
    };
    await expect(viewerHasApprovedPhoto(matches, profileId)).resolves.toBe(
      false,
    );
  });

  it('viewerHasApprovedPhoto returns true when count is at least 1', async () => {
    const matches = {
      countApprovedPhotosForProfile: jest.fn().mockResolvedValue(1),
    };
    await expect(viewerHasApprovedPhoto(matches, profileId)).resolves.toBe(
      true,
    );
  });

  it('candidateHasApprovedPhoto delegates to approved photo count', async () => {
    const count = jest.fn().mockResolvedValue(1);
    const matches = { countApprovedPhotosForProfile: count };
    await expect(candidateHasApprovedPhoto(matches, profileId)).resolves.toBe(
      true,
    );
    expect(count).toHaveBeenCalledWith(profileId);
  });
});
