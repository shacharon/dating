import { AcceptedPartnerGender } from '../../canonical/matching-canonical.types';
import { mapProfileSourceToMatchingCanonical } from '../profile-to-canonical.mapper';
import { mapMatchingPreferencesToWireDto } from './holy-grail-retrieval-wire.dto';

describe('holy-grail-retrieval-wire.dto', () => {
  it('maps kept preference fields only', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      structuredPreferences: {
        acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE],
        partnerAgeMin: 25,
        partnerAgeMax: 40,
        maxDistanceKm: 50,
      },
    });
    expect(mapMatchingPreferencesToWireDto(m.preferences)).toEqual({
      acceptedPartnerGenders: ['FEMALE'],
      partnerAgeMin: 25,
      partnerAgeMax: 40,
      maxDistanceKm: 50,
    });
  });
});
