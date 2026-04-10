/**
 * Stable ids for Step 2/3 enforced dimensions (excluding informational-only).
 */

export const HOLY_GRAIL_DIMENSION_KEYS = [
  'GENDER',
  'AGE',
  'RELIGION',
  'EDUCATION',
  'SMOKING',
  'ALCOHOL',
  'PARTNER_HAS_CHILDREN',
  'PARTNER_WANTS_CHILDREN',
  'PROXIMITY',
] as const;

export type HolyGrailDimensionKey = (typeof HOLY_GRAIL_DIMENSION_KEYS)[number];
