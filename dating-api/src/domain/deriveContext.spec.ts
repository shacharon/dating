import {
  deriveContextFromProfileTexts,
  resolveDerivedContext,
} from './deriveContext';

describe('resolveDerivedContext', () => {
  it('uses LLM derivedContext when present even without shift keywords in texts', () => {
    const ctx = resolveDerivedContext(
      {
        derivedContext: {
          version: 'v1',
          occupationClass: 'SHIFT_UNPREDICTABLE',
          visibilityNeed: 5,
          lifeStage: 5,
        },
      },
      { aboutMe: 'Calm and thoughtful person who enjoys reading.' },
    );
    expect(ctx.occupationClass).toBe('SHIFT_UNPREDICTABLE');
  });

  it('falls back to regex when derivedContext absent', () => {
    const ctx = resolveDerivedContext(undefined, {
      aboutMe: 'I work night shift as a nurse with rotating schedule.',
    });
    expect(ctx.occupationClass).toBe('SHIFT_UNPREDICTABLE');
  });

  it('falls back to regex when derivedContext is missing version v1', () => {
    const ctx = resolveDerivedContext(
      {
        derivedContext: {
          occupationClass: 'SHIFT_UNPREDICTABLE',
          visibilityNeed: 2,
          lifeStage: 5,
        } as { version?: string },
      },
      { aboutMe: 'Generic calm person.' },
    );
    expect(ctx.occupationClass).toBeUndefined();
  });

  it('does not apply regex when v1 derivedContext has default numerics', () => {
    const ctx = resolveDerivedContext(
      {
        derivedContext: {
          version: 'v1',
          occupationClass: null,
          visibilityNeed: 5,
          lifeStage: 5,
        },
      },
      { aboutMe: 'I keep to myself and prefer a private quiet life.' },
    );
    expect(ctx.visibilityNeed).toBe(5);
    expect(ctx.lifeStage).toBe(5);
  });
});

describe('deriveContextFromProfileTexts', () => {
  it('detects low visibility from keywords', () => {
    const ctx = deriveContextFromProfileTexts({
      aboutMe: 'I keep to myself and prefer a private quiet life.',
    });
    expect(ctx.visibilityNeed).toBe(2);
  });
});
