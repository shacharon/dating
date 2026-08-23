import { parseGoogleClientIds } from './google-oauth.config';

describe('parseGoogleClientIds', () => {
  it('returns empty array when unset', () => {
    expect(parseGoogleClientIds({})).toEqual([]);
  });

  it('parses GOOGLE_CLIENT_ID only', () => {
    expect(
      parseGoogleClientIds({
        GOOGLE_CLIENT_ID: ' web-id.apps.googleusercontent.com ',
      }),
    ).toEqual(['web-id.apps.googleusercontent.com']);
  });

  it('parses comma-separated GOOGLE_CLIENT_IDS', () => {
    expect(
      parseGoogleClientIds({
        GOOGLE_CLIENT_IDS:
          'web-id.apps.googleusercontent.com, android-id.apps.googleusercontent.com ,ios-id.apps.googleusercontent.com',
      }),
    ).toEqual([
      'web-id.apps.googleusercontent.com',
      'android-id.apps.googleusercontent.com',
      'ios-id.apps.googleusercontent.com',
    ]);
  });

  it('unions GOOGLE_CLIENT_IDS with GOOGLE_CLIENT_ID and dedupes', () => {
    expect(
      parseGoogleClientIds({
        GOOGLE_CLIENT_IDS: 'web-id.apps.googleusercontent.com,android-id.apps.googleusercontent.com',
        GOOGLE_CLIENT_ID: 'web-id.apps.googleusercontent.com',
      }),
    ).toEqual([
      'web-id.apps.googleusercontent.com',
      'android-id.apps.googleusercontent.com',
    ]);
  });

  it('appends GOOGLE_CLIENT_ID when not already in GOOGLE_CLIENT_IDS list', () => {
    expect(
      parseGoogleClientIds({
        GOOGLE_CLIENT_IDS: 'android-id.apps.googleusercontent.com',
        GOOGLE_CLIENT_ID: 'web-id.apps.googleusercontent.com',
      }),
    ).toEqual([
      'android-id.apps.googleusercontent.com',
      'web-id.apps.googleusercontent.com',
    ]);
  });

  it('skips empty segments and whitespace-only entries', () => {
    expect(
      parseGoogleClientIds({
        GOOGLE_CLIENT_IDS: 'web-id,,  ,android-id',
      }),
    ).toEqual(['web-id', 'android-id']);
  });

  it('dedupes duplicates within GOOGLE_CLIENT_IDS', () => {
    expect(
      parseGoogleClientIds({
        GOOGLE_CLIENT_IDS: 'same-id,same-id,other-id',
      }),
    ).toEqual(['same-id', 'other-id']);
  });
});
