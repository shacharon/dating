import {
  EXTRACTION_SIGNAL_KEYS,
  MAX_EVIDENCE_ITEMS,
  OFFICIAL_EXTRACTION_SIGNAL_KEYS,
  SHADOW_SIGNAL_KEYS,
  SHADOW_SIGNAL_KEYS_SET,
} from './extracted-signals.interface';

describe('extracted-signals shape', () => {
  describe('SHADOW_SIGNAL_KEYS', () => {
    it('includes the remaining original shadow keys', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('intellectualCuriosity');
      expect(SHADOW_SIGNAL_KEYS).toContain('noveltyVsRoutine');
      expect(SHADOW_SIGNAL_KEYS).toContain('structureChaosTolerance');
    });

    it('does not include conflictStyle (promoted to official in sprint 21)', () => {
      expect(SHADOW_SIGNAL_KEYS).not.toContain('conflictStyle');
    });

    it('includes the four Phase A expansion keys', () => {
      expect(SHADOW_SIGNAL_KEYS).toContain('emotionalAvailability');
      expect(SHADOW_SIGNAL_KEYS).toContain('emotionalSafety');
      expect(SHADOW_SIGNAL_KEYS).toContain('commitmentIntentDepth');
      expect(SHADOW_SIGNAL_KEYS).toContain('practicalLifeReadiness');
    });

    it('contains exactly 7 keys', () => {
      expect(SHADOW_SIGNAL_KEYS.length).toBe(7);
    });
  });

  describe('SHADOW_SIGNAL_KEYS_SET', () => {
    it('provides O(1) lookup for new shadow keys', () => {
      expect(SHADOW_SIGNAL_KEYS_SET.has('emotionalAvailability')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('emotionalSafety')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('commitmentIntentDepth')).toBe(true);
      expect(SHADOW_SIGNAL_KEYS_SET.has('practicalLifeReadiness')).toBe(true);
    });

    it('does not include official keys', () => {
      expect(SHADOW_SIGNAL_KEYS_SET.has('ambition')).toBe(false);
      expect(SHADOW_SIGNAL_KEYS_SET.has('emotionalDepth')).toBe(false);
    });
  });

  describe('EXTRACTION_SIGNAL_KEYS', () => {
    it('is the union of official + shadow keys', () => {
      const allKeys = new Set(EXTRACTION_SIGNAL_KEYS);
      for (const k of OFFICIAL_EXTRACTION_SIGNAL_KEYS) {
        expect(allKeys.has(k)).toBe(true);
      }
      for (const k of SHADOW_SIGNAL_KEYS) {
        expect(allKeys.has(k)).toBe(true);
      }
    });

    it('total count equals 15 official + 7 shadow', () => {
      expect(EXTRACTION_SIGNAL_KEYS.length).toBe(
        OFFICIAL_EXTRACTION_SIGNAL_KEYS.length + SHADOW_SIGNAL_KEYS.length,
      );
      expect(EXTRACTION_SIGNAL_KEYS.length).toBe(22);
    });
  });

  describe('MAX_EVIDENCE_ITEMS', () => {
    it('is at least as large as total signal key count with buffer', () => {
      expect(MAX_EVIDENCE_ITEMS).toBeGreaterThanOrEqual(
        EXTRACTION_SIGNAL_KEYS.length,
      );
    });

    it('equals 26 (15 official + 7 shadow + 4 buffer)', () => {
      expect(MAX_EVIDENCE_ITEMS).toBe(26);
    });
  });

  describe('no overlap between official and shadow keys', () => {
    it('no key appears in both lists', () => {
      const officialSet = new Set(OFFICIAL_EXTRACTION_SIGNAL_KEYS);
      for (const k of SHADOW_SIGNAL_KEYS) {
        expect(officialSet.has(k)).toBe(false);
      }
    });
  });
});
