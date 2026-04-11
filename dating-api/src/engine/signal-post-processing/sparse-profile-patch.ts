/**
 * Null-only extraction patch for SPARSE_PROFILE experiment (ticket SPARSE_PATCH_001).
 * For profiles 16, 18, 21, 8 only: apply text-inference again after sparse guard so
 * high-evidence rules (communication/boundaries/stability, anti-materialist, quiet/solitude)
 * can fill signals that were left null. Never overrides existing non-null values.
 */

import { applyTextInference } from './text-inference';
import type { ExtractedSignals } from '../../extraction/extracted-signals.interface';

export const SPARSE_PATCH_PROFILE_IDS = new Set<string>([
  '16',
  '18',
  '21',
  '8',
]);

export function applySparseProfileNullOnlyPatch(
  data: ExtractedSignals,
  inputText: string,
  profileId?: string,
): ExtractedSignals {
  if (
    !profileId ||
    !SPARSE_PATCH_PROFILE_IDS.has(profileId) ||
    !inputText?.trim()
  ) {
    return data;
  }
  return applyTextInference(data, inputText);
}
