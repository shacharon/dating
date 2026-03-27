import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MatchCard } from './match-card';

const baseMatch = {
  id: 'm-test',
  name: 'Test',
  age: 30,
  summary: 'Summary line.',
  compatibilityScore: 82,
  strongReason: 'Legacy strong.',
  frictionPoint: 'Legacy friction.',
};

describe('MatchCard explainability', () => {
  it('renders explainability path when explainability is present', () => {
    const html = renderToStaticMarkup(
      <MatchCard
        match={{
          ...baseMatch,
          explainability: {
            positiveChips: ['A', 'B'],
            tensionChip: 'Tension',
            reasonShort: 'One line reason.',
          },
        }}
      />,
    );
    expect(html).toContain('data-testid="explainability-reason"');
    expect(html).toContain('One line reason.');
    expect(html).not.toContain('Legacy strong.');
  });

  it('renders legacy copy when explainability is absent', () => {
    const html = renderToStaticMarkup(<MatchCard match={baseMatch} />);
    expect(html).not.toContain('explainability-reason');
    expect(html).toContain('Legacy strong.');
    expect(html).toContain('Summary line.');
  });
});
