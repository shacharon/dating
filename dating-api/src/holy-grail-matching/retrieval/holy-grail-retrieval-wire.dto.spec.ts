import { AcceptedPartnerGender } from '../../canonical/matching-canonical.types';
import { mapProfileSourceToMatchingCanonical } from '../profile-to-canonical.mapper';
import { mapMatchingPreferencesToWireDto } from './holy-grail-retrieval-wire.dto';

describe('holy-grail-retrieval-wire.dto', () => {
  it('mapMatchingPreferencesToWireDto omits similarityPreference when absent on canonical prefs', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      structuredPreferences: { acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE] },
    });
    const w = mapMatchingPreferencesToWireDto(m.preferences);
    expect(w.similarityPreference).toBeUndefined();
    expect(w.acceptedPartnerGenders).toEqual([AcceptedPartnerGender.FEMALE]);
  });

  it('mapMatchingPreferencesToWireDto copies similarityPreference and null', () => {
    const a = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      structuredPreferences: { similarityPreference: 'similar' },
    });
    expect(mapMatchingPreferencesToWireDto(a.preferences).similarityPreference).toBe('similar');

    const b = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      structuredPreferences: { similarityPreference: null },
    });
    expect(mapMatchingPreferencesToWireDto(b.preferences).similarityPreference).toBeNull();
  });
});
