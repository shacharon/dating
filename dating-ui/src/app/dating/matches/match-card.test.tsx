import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MatchCard } from './match-card';
import type { GenericMatchCardModel } from '../_lib/matches-list';

const base: GenericMatchCardModel = {
  id: 'a__b',
  pairLabel: 'Alex · Jordan',
  score: 82,
  reasonShort: 'Strong alignment on lifestyle.',
  chips: ['Warmth', 'Stability'],
  primaryTakeaway: 'Good day-to-day fit with shared pace.',
};

describe('MatchCard', () => {
  it('renders pair label, score, reasonShort, chips, primaryTakeaway', () => {
    const html = renderToStaticMarkup(<MatchCard match={base} />);
    expect(html).toContain('Alex · Jordan');
    expect(html).toContain('82');
    expect(html).toContain('Strong alignment on lifestyle.');
    expect(html).toContain('Warmth');
    expect(html).toContain('Good day-to-day fit');
    expect(html).toContain('/dating/matches/a__b');
  });

  it('omits chip row when chips empty', () => {
    const html = renderToStaticMarkup(<MatchCard match={{ ...base, chips: [] }} />);
    expect(html).not.toContain('data-testid="match-card-chips"');
  });

  it('omits reason and takeaway when empty strings', () => {
    const html = renderToStaticMarkup(
      <MatchCard match={{ ...base, reasonShort: '', primaryTakeaway: '' }} />,
    );
    expect(html).not.toContain('data-testid="match-card-reason-short"');
    expect(html).not.toContain('data-testid="match-card-primary-takeaway"');
  });
});
