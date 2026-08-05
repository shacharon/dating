/** @vitest-environment jsdom */
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AnalysisProgressPanel } from '@/components/analysis-progress-panel';

describe('AnalysisProgressPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows submitted step label when status is SUBMITTED', () => {
    render(<AnalysisProgressPanel profileStatus="SUBMITTED" />);
    expect(screen.getByTestId('analysis-step-submitted').textContent).toContain(
      'Submitted — queued',
    );
  });

  it('shows analyzing step label when status is ANALYZING', () => {
    render(<AnalysisProgressPanel profileStatus="ANALYZING" />);
    expect(screen.getByTestId('analysis-step-analyzing').textContent).toContain(
      'Analyzing your profile',
    );
  });

  it('links to the algorithm explainer', () => {
    render(<AnalysisProgressPanel profileStatus="ANALYZING" />);
    expect(screen.getByTestId('analysis-learn-algorithm').getAttribute('href')).toBe(
      '/about/algorithm',
    );
  });
});
