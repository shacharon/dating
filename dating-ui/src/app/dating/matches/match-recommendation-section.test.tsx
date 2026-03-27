import { render, screen } from '@testing-library/react';
import { MatchRecommendationSection } from './match-recommendation-section';
import type { MatchRecommendationDto } from '../_lib/types';

describe('MatchRecommendationSection', () => {
  const mockExplainability = {
    positiveChips: ['Emotional depth', 'Direct communication'],
    reasonShort: 'Strong alignment on emotional depth and direct communication.',
  };

  it('renders nothing when recommendation is null', () => {
    const { container } = render(<MatchRecommendationSection recommendation={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when recommendation is undefined', () => {
    const { container } = render(<MatchRecommendationSection recommendation={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders primary takeaway prominently', () => {
    const recommendation: MatchRecommendationDto = {
      explainability: mockExplainability,
      primaryTakeaway: 'Strong clear fit, especially around emotional depth.',
      suggestedNextAction: 'Start a conversation',
    };

    render(<MatchRecommendationSection recommendation={recommendation} />);

    const takeaway = screen.getByTestId('recommendation-takeaway');
    expect(takeaway).toHaveTextContent('Strong clear fit, especially around emotional depth.');
    expect(takeaway).toHaveClass('font-semibold');
  });

  it('renders caution when present', () => {
    const recommendation: MatchRecommendationDto = {
      explainability: mockExplainability,
      primaryTakeaway: 'Strong clear fit.',
      caution: 'Watch for closeness vs space.',
      suggestedNextAction: 'Start a conversation',
    };

    render(<MatchRecommendationSection recommendation={recommendation} />);

    const caution = screen.getByTestId('recommendation-caution');
    expect(caution).toHaveTextContent('Watch for closeness vs space.');
    expect(caution).toHaveTextContent('!');
  });

  it('does not render caution when absent', () => {
    const recommendation: MatchRecommendationDto = {
      explainability: mockExplainability,
      primaryTakeaway: 'Strong clear fit.',
      suggestedNextAction: 'Start a conversation',
    };

    render(<MatchRecommendationSection recommendation={recommendation} />);

    expect(screen.queryByTestId('recommendation-caution')).not.toBeInTheDocument();
  });

  it('renders suggested next action with arrow', () => {
    const recommendation: MatchRecommendationDto = {
      explainability: mockExplainability,
      primaryTakeaway: 'Moderate fit.',
      suggestedNextAction: 'Worth a closer look',
    };

    render(<MatchRecommendationSection recommendation={recommendation} />);

    const action = screen.getByTestId('recommendation-action');
    expect(action).toHaveTextContent('→ Worth a closer look');
  });

  it('applies card variant styling by default', () => {
    const recommendation: MatchRecommendationDto = {
      explainability: mockExplainability,
      primaryTakeaway: 'Solid fit.',
      suggestedNextAction: 'Review profile and message',
    };

    const { container } = render(<MatchRecommendationSection recommendation={recommendation} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('gap-2.5');
    expect(wrapper).toHaveClass('p-4');
  });

  it('applies detail variant styling when specified', () => {
    const recommendation: MatchRecommendationDto = {
      explainability: mockExplainability,
      primaryTakeaway: 'Solid fit.',
      suggestedNextAction: 'Review profile and message',
    };

    const { container } = render(
      <MatchRecommendationSection recommendation={recommendation} variant="detail" />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('gap-3');
    expect(wrapper).toHaveClass('p-5');
  });

  it('renders all three elements when caution is present', () => {
    const recommendation: MatchRecommendationDto = {
      explainability: mockExplainability,
      primaryTakeaway: 'Partial overlap, mainly around relationship expectations.',
      caution: 'Note potential compatibility concerns.',
      suggestedNextAction: 'Skim profile first',
    };

    render(<MatchRecommendationSection recommendation={recommendation} />);

    expect(screen.getByTestId('recommendation-takeaway')).toBeInTheDocument();
    expect(screen.getByTestId('recommendation-caution')).toBeInTheDocument();
    expect(screen.getByTestId('recommendation-action')).toBeInTheDocument();
  });

  it('does not show raw scores or duplicate chips', () => {
    const recommendation: MatchRecommendationDto = {
      explainability: mockExplainability,
      primaryTakeaway: 'Limited fit with narrow overlap on ambition alignment.',
      suggestedNextAction: 'Consider other matches first',
    };

    render(<MatchRecommendationSection recommendation={recommendation} />);

    const container = screen.getByTestId('match-recommendation');
    // Should not contain raw numeric scores
    expect(container.textContent).not.toMatch(/\b\d{2,3}\b/);
    // Should not duplicate chip content (chips are in explainability section)
    expect(container.textContent).not.toContain('Emotional depth');
    expect(container.textContent).not.toContain('Direct communication');
  });
});
