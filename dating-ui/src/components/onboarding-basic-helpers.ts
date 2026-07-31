import type { MeProfileGender } from '@/lib/me-profile-api';

export function ageFromBirthInput(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const b = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function normalizeNicknameValue(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function togglePartnerGender(
  prev: MeProfileGender[],
  g: MeProfileGender,
  checked: boolean,
): MeProfileGender[] {
  const next = new Set(prev);
  if (checked) next.add(g);
  else next.delete(g);
  return Array.from(next) as MeProfileGender[];
}
