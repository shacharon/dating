import {

  buildExpansion03ShadowBreakdown,

  SHADOW_POSITIVE_CHIP_BY_SIGNAL,

} from './expansion-03-explainability';

import { pickPositiveChips } from '../../core/match-explainability';



describe('buildExpansion03ShadowBreakdown', () => {

  it('builds entry with pairScore >= 7 when both sides are high', () => {

    const breakdown = buildExpansion03ShadowBreakdown(

      { humorPlayfulness: 8 },

      { humorPlayfulness: 8 },

    );

    expect(breakdown).toHaveLength(1);

    expect(breakdown[0]?.key).toBe('humorPlayfulness');

    expect(breakdown[0]?.pairScore).toBeGreaterThanOrEqual(7);

  });



  it('skips keys when either side is null', () => {

    expect(

      buildExpansion03ShadowBreakdown({ humorPlayfulness: 8 }, {}),

    ).toEqual([]);

    expect(

      buildExpansion03ShadowBreakdown({}, { humorPlayfulness: 8 }),

    ).toEqual([]);

  });



  it('skips non-finite values', () => {

    expect(

      buildExpansion03ShadowBreakdown(

        { humorPlayfulness: Number.NaN },

        { humorPlayfulness: 8 },

      ),

    ).toEqual([]);

  });

});



describe('Expansion-03 shadow positive chips', () => {

  it('pickPositiveChips includes Shared playfulness from shadow-only high humorPlayfulness', () => {

    const chips = pickPositiveChips([

      {

        key: 'humorPlayfulness',

        self: 8,

        partner: 8,

        gap: 0,

        pairScore: 10,

      },

    ]);

    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.humorPlayfulness);

  });

});

