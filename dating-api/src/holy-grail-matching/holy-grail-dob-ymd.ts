/**
 * Single module for Holy Grail DOB / calendar YYYY-MM-DD handling (ingestion + shared age math).
 * Evaluator business rules stay in `eligibility.evaluator.ts`; this file is format/calendar/age only.
 */

/** YYYY-MM-DD; capture groups for calendar validation. */
export const HOLY_GRAIL_DOB_YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isHolyGrailDobYmdString(s: string): boolean {
  return HOLY_GRAIL_DOB_YMD_RE.test(s);
}

/**
 * Strict calendar date in UTC; same errors as `profile-to-canonical.mapper` DOB checks.
 */
export function assertHolyGrailCalendarDateYmd(s: string): string {
  const m = HOLY_GRAIL_DOB_YMD_RE.exec(s);
  if (!m) {
    throw new Error(
      `HolyGrail map: dateOfBirth must be YYYY-MM-DD, got ${JSON.stringify(s)}`,
    );
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(
      `HolyGrail map: invalid calendar date dateOfBirth ${JSON.stringify(s)}`,
    );
  }
  return s;
}

export function assertHolyGrailDateOfBirthNotFuture(ymd: string): void {
  const m = HOLY_GRAIL_DOB_YMD_RE.exec(ymd);
  if (!m) {
    return;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dobUtc = Date.UTC(y, mo - 1, d);
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  if (dobUtc > todayUtc) {
    throw new Error(
      `HolyGrail map: dateOfBirth must not be in the future, got ${JSON.stringify(ymd)}`,
    );
  }
}

/**
 * Lenient DB JSON read path: keep only strings that match YYYY-MM-DD shape (no full calendar check).
 * Invalid calendar dates may still flow to the mapper, which throws — unchanged product behavior.
 */
export function pickHolyGrailDateOfBirthDbJson(v: unknown): string | undefined {
  return typeof v === 'string' && isHolyGrailDobYmdString(v) ? v : undefined;
}

/** Whole years at `ref` (UTC), or undefined if `ymd` is not a valid YYYY-MM-DD shape. */
export function ageWholeYearsUtcFromYmd(
  dateOfBirthYmd: string,
  ref: Date,
): number | undefined {
  const m = HOLY_GRAIL_DOB_YMD_RE.exec(dateOfBirthYmd);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ty = ref.getUTCFullYear();
  const tm = ref.getUTCMonth();
  const td = ref.getUTCDate();
  let age = ty - y;
  if (tm < mo - 1 || (tm === mo - 1 && td < d)) age -= 1;
  return age;
}
