/** Test support only ΓÇö excluded from Nest dist via tsconfig.build. */

export function extractCookieValue(
  headers: Record<string, unknown>,
  name: string,
): string | undefined {
  const setCookie = headers['set-cookie'];
  if (!Array.isArray(setCookie)) return undefined;
  for (const line of setCookie) {
    if (typeof line === 'string' && line.startsWith(`${name}=`)) {
      return line.split(';')[0].slice(name.length + 1);
    }
  }
  return undefined;
}

export function makeBaseProfileRow(id: string, userId: string): Record<string, unknown> {
  return {
    id,
    userId,
    name: '',
    nickname: null,
    status: 'DRAFT',
    onboardingStep: 'BASIC',
    aboutMe: null,
    aboutPartner: null,
    aboutRelationship: null,
    birthDate: null,
    gender: null,
    desiredPartnerGenders: null,
    city: null,
    country: null,
    locationLabel: null,
    submittedAt: null,
    analyzedAt: null,
    lastAnalysisError: null,
    childrenStatus: null,
    wantsChildren: null,
    smokingFrequency: null,
    alcoholUse: null,
    education: null,
    religion: null,
    _count: { evaluations: 0 },
    createdAt: new Date('2026-04-18T10:00:00.000Z'),
    updatedAt: new Date('2026-04-18T10:00:00.000Z'),
  };
}
