import { describe, expect, it } from 'vitest';
import {
  STORY_PLACEHOLDER_STEP_COUNT,
  storyPlaceholder,
  storyPlaceholderDir,
} from '@/lib/onboarding/story-placeholder-cycle';

describe('storyPlaceholder', () => {
  it('walks two Hebrew, two English, two Arabic, two Russian, then English again', () => {
    const lines = Array.from({ length: STORY_PLACEHOLDER_STEP_COUNT + 3 }, (_, step) =>
      storyPlaceholder('aboutMe', step),
    );

    expect(lines[0]).toMatch(/בשנקין/);
    expect(lines[1]).toMatch(/תל אביב/);
    expect(lines[2]).toBe(
      "e.g. Italian restaurant, 300 meters away, on Shenkin. I'm Aliza.",
    );
    expect(lines[3]).toMatch(/Tel Aviv/);
    expect(lines[4]).toMatch(/شنكين/);
    expect(lines[5]).toMatch(/تل أبيب/);
    expect(lines[6]).toMatch(/Шенкин/);
    expect(lines[7]).toMatch(/Тель-Авиве/);
    expect(lines[8]).toBe(lines[0]);
    expect(lines[10]).toBe(lines[2]);
  });

  it('uses right-to-left for Hebrew and Arabic lines', () => {
    expect(storyPlaceholderDir(0)).toBe('rtl');
    expect(storyPlaceholderDir(1)).toBe('rtl');
    expect(storyPlaceholderDir(2)).toBe('ltr');
    expect(storyPlaceholderDir(4)).toBe('rtl');
    expect(storyPlaceholderDir(6)).toBe('ltr');
  });
});
