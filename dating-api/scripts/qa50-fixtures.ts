/**
 * Sprint QA local pool Story 1 — catalog of 50 deletable `qa50_*` profiles.
 * Prefix `qa50_` is required for scoped cleanup.
 */

export const QA50_PREFIX = 'qa50_';
export const EVAL_VERSION = 'qa50-seed-v1';

export const QA50_INTEREST_CODES = [
  'walking',
  'hiking',
  'music',
  'reading',
  'swimming',
  'lifting',
  'cycling',
  'cooking',
  'travel',
  'photography',
  'extreme_sports',
  'journaling',
  'yoga',
  'gaming',
  'meditation',
  'pilates',
  'gym',
  'running',
  'fungi',
  'pottery',
  'model_building',
  'boating',
  'fermentation',
  'cartography',
] as const;

export const QA50_CITIES = [
  'Tel Aviv',
  'Jerusalem',
  'Haifa',
  'Beer Sheva',
  'Eilat',
  'Herzliya',
  'Rishon LeZion',
  'Netanya',
] as const;

export type Qa50WantsChildren = 'YES' | 'NO' | 'UNSURE';

export type Qa50ProfileDef = {
  key: string;
  userId: string;
  profileId: string;
  photoId: string;
  sessionId: string | null;
  rawSessionToken: string | null;
  email: string;
  nickname: string;
  displayName: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  ageApprox: number;
  city: string;
  wantsChildren: Qa50WantsChildren;
  interests: [string, string, string];
  signalValue: number;
  aboutMe: string;
  isViewer: boolean;
  photoRgb: [number, number, number];
};

const MALE_NAMES = [
  'Noam',
  'Idan',
  'Yoni',
  'Amit',
  'Eyal',
  'Omer',
  'Tal',
  'Roi',
  'Gil',
  'Asaf',
  'Dan',
  'Lior',
  'Itai',
  'Barak',
  'Nir',
  'Shai',
  'Or',
  'Tom',
  'Eden',
  'Gal',
  'Alon',
  'Matan',
  'Yuval',
  'Raz',
  'Ben',
];

const FEMALE_NAMES = [
  'Noa',
  'Maya',
  'Yael',
  'Tamar',
  'Shira',
  'Dana',
  'Michal',
  'Hila',
  'Rotem',
  'Inbal',
  'Adi',
  'Lior',
  'Noya',
  'Maayan',
  'Keren',
  'Roni',
  'Ayala',
  'Hadar',
  'Mor',
  'Lihi',
  'Sapir',
  'Gili',
  'Ofri',
  'Neta',
  'Chen',
];

function interestsForIndex(i: number): [string, string, string] {
  const n = QA50_INTEREST_CODES.length;
  return [
    QA50_INTEREST_CODES[i % n]!,
    QA50_INTEREST_CODES[(i + 8) % n]!,
    QA50_INTEREST_CODES[(i + 16) % n]!,
  ];
}

function wantsForIndex(i: number): Qa50WantsChildren {
  // ~40% YES / 30% UNSURE / 30% NO
  const r = i % 10;
  if (r < 4) return 'YES';
  if (r < 7) return 'UNSURE';
  return 'NO';
}

function ageForIndex(i: number): number {
  // Spread 22–45 inclusive
  return 22 + ((i * 5) % 24);
}

function birthDateForAge(age: number): string {
  const year = 2026 - age;
  const month = String(((age * 3) % 12) + 1).padStart(2, '0');
  const day = String(((age * 7) % 28) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rgbForIndex(i: number): [number, number, number] {
  return [
    40 + ((i * 37) % 180),
    40 + ((i * 53) % 180),
    40 + ((i * 71) % 180),
  ];
}

function makeDef(opts: {
  key: string;
  gender: 'MALE' | 'FEMALE';
  nameIndex: number;
  poolIndex: number;
  city?: string;
  ageApprox?: number;
  wantsChildren?: Qa50WantsChildren;
  isViewer?: boolean;
  sessionKey?: string;
}): Qa50ProfileDef {
  const ageApprox = opts.ageApprox ?? ageForIndex(opts.poolIndex);
  const city =
    opts.city ?? QA50_CITIES[opts.poolIndex % QA50_CITIES.length]!;
  const names = opts.gender === 'MALE' ? MALE_NAMES : FEMALE_NAMES;
  const displayName = `${names[opts.nameIndex % names.length]} ${opts.key.toUpperCase()}`;
  const interests = interestsForIndex(opts.poolIndex);
  const wants = opts.wantsChildren ?? wantsForIndex(opts.poolIndex);
  const signalValue = 3 + (opts.poolIndex % 6); // 3..8
  const isViewer = Boolean(opts.isViewer);

  return {
    key: opts.key,
    userId: `qa50_user_${opts.key}`,
    profileId: `qa50_prof_${opts.key}`,
    photoId: `qa50_photo_${opts.key}`,
    sessionId: isViewer ? `qa50_sess_${opts.key}` : null,
    rawSessionToken: isViewer
      ? `qa50-viewer-${opts.key}-session-token-fixed-01`
      : null,
    email: `qa50-${opts.key}@bondit-test.local`,
    nickname: `qa50_${opts.key}`,
    displayName,
    gender: opts.gender,
    birthDate: birthDateForAge(ageApprox),
    ageApprox,
    city,
    wantsChildren: wants,
    interests,
    signalValue,
    aboutMe: `${displayName} in ${city}. Into ${interests.join(', ')}. QA pool profile (deletable).`,
    isViewer,
    photoRgb: rgbForIndex(opts.poolIndex),
  };
}

/** Fixed viewers (included in the 50). */
const VIEWERS: Qa50ProfileDef[] = [
  makeDef({
    key: 'v01',
    gender: 'MALE',
    nameIndex: 0,
    poolIndex: 0,
    city: 'Tel Aviv',
    ageApprox: 30,
    wantsChildren: 'YES',
    isViewer: true,
  }),
  makeDef({
    key: 'v02',
    gender: 'FEMALE',
    nameIndex: 0,
    poolIndex: 1,
    city: 'Haifa',
    ageApprox: 28,
    wantsChildren: 'YES',
    isViewer: true,
  }),
  makeDef({
    key: 'v03',
    gender: 'MALE',
    nameIndex: 1,
    poolIndex: 2,
    city: 'Jerusalem',
    ageApprox: 38,
    wantsChildren: 'UNSURE',
    isViewer: true,
  }),
  makeDef({
    key: 'v04',
    gender: 'FEMALE',
    nameIndex: 1,
    poolIndex: 3,
    city: 'Beer Sheva',
    ageApprox: 33,
    wantsChildren: 'NO',
    isViewer: true,
  }),
];

/** Remaining 46: 23 M + 23 F → total 25/25 with viewers. */
function buildPool(): Qa50ProfileDef[] {
  const out: Qa50ProfileDef[] = [...VIEWERS];
  let maleName = 2;
  let femaleName = 2;
  let poolIndex = 4;
  // 23 more males (p01..p23), 23 more females (p24..p46)
  for (let i = 1; i <= 23; i++) {
    const key = `p${String(i).padStart(2, '0')}`;
    out.push(
      makeDef({
        key,
        gender: 'MALE',
        nameIndex: maleName++,
        poolIndex: poolIndex++,
      }),
    );
  }
  for (let i = 24; i <= 46; i++) {
    const key = `p${String(i).padStart(2, '0')}`;
    out.push(
      makeDef({
        key,
        gender: 'FEMALE',
        nameIndex: femaleName++,
        poolIndex: poolIndex++,
      }),
    );
  }
  return out;
}

export const QA50_PROFILES: Qa50ProfileDef[] = buildPool();

export const QA50_VIEWERS = QA50_PROFILES.filter((p) => p.isViewer);

export const QA50_USER_IDS = QA50_PROFILES.map((p) => p.userId);
export const QA50_PROFILE_IDS = QA50_PROFILES.map((p) => p.profileId);

export function assertAllIdsPrefixed(ids: string[]): void {
  for (const id of ids) {
    if (!id.startsWith(QA50_PREFIX)) {
      throw new Error(`Refusing non-qa50 id in cleanup set: ${id}`);
    }
  }
}
