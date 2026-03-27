import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MatchExplainabilitySection } from './match-explainability-section';

describe('MatchExplainabilitySection', () => {
  it('renders reasonShort, positive chips, and tension chip', () => {
    const reasonShort =
      'Clearest fit shows up around Shared values and Direct communication; overall this reads as a strong match. Main tension: different relationship expectations.';
    const html = renderToStaticMarkup(
      <MatchExplainabilitySection
        explainability={{
          positiveChips: ['Shared values', 'Direct communication'],
          tensionChip: 'Different relationship expectations',
          reasonShort,
        }}
      />,
    );
    expect(html).toContain('data-testid="explainability-reason"');
    expect(html).toContain(reasonShort.slice(0, 40));
    expect(html).toContain('data-testid="explainability-chips"');
    expect(html).toContain('Shared values');
    expect(html).toContain('data-testid="explainability-tension-chip"');
    expect(html).toContain('Different relationship expectations');
  });

  it('renders without tension chip when omitted', () => {
    const reasonShort =
      'Emotional depth is where your profiles line up most convincingly, with a solid compatibility read.';
    const html = renderToStaticMarkup(
      <MatchExplainabilitySection
        explainability={{
          positiveChips: ['Emotional depth'],
          reasonShort,
        }}
      />,
    );
    expect(html).toContain('Emotional depth is where your profiles');
    expect(html).not.toContain('explainability-tension-chip');
  });

  it('detail variant adds top spacing for match details screen', () => {
    const html = renderToStaticMarkup(
      <MatchExplainabilitySection
        variant="detail"
        explainability={{
          positiveChips: ['X'],
          reasonShort: 'Detail reason.',
        }}
      />,
    );
    expect(html).toContain('mt-6');
  });
});
