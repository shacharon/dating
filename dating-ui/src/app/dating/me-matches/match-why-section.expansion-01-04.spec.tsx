/** @vitest-environment jsdom */
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { getCopy } from '@/lib/i18n';
import { MatchWhySection } from './match-why-section';
import { baseMatch } from './match-why-section.spec-support';

afterEach(() => {
  cleanup();
});

describe('MatchWhySection expansion chips (01-04)', () => {
  describe('MatchWhySection Expansion-01 chips', () => {
    it('EN — Understanding & care shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence =
        enCopy.matches.list.browse.chipEvidence['Understanding & care'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Understanding & care'],
            reasonShort: 'Strong overlap on empathy.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Understanding & care')).toBeNull();
    });

    it('HE — Authentic openness shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Authentic openness'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Authentic openness'],
            reasonShort: 'חפיפה ברורה.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Authentic openness')).toBeNull();
    });

    it('renders tension chip from API as-is (English)', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Mixed fit.',
            tensionChip: 'Empathy mismatch',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Empathy mismatch')).toBeTruthy();
    });
  });

  describe('MatchWhySection Expansion-02 chips', () => {
    it('EN — Emotional balance shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence = enCopy.matches.list.browse.chipEvidence['Emotional balance'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Emotional balance'],
            reasonShort: 'Strong emotional steadiness overlap.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Emotional balance')).toBeNull();
    });

    it('HE — Affection rhythm match shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Affection rhythm match'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Affection rhythm match'],
            reasonShort: 'חפיפה ברורה.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Affection rhythm match')).toBeNull();
    });

    it('renders Expansion-02 tension chip from API as-is (English)', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Mixed fit on regulation.',
            tensionChip: 'Emotional steadiness gap',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Emotional steadiness gap')).toBeTruthy();
    });
  });

  describe('MatchWhySection Expansion-03 chips', () => {
    it('EN — Shared playfulness shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence = enCopy.matches.list.browse.chipEvidence['Shared playfulness'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Shared playfulness'],
            reasonShort: 'Strong playfulness overlap.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Shared playfulness')).toBeNull();
    });

    it('HE — Shared playfulness shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Shared playfulness'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Shared playfulness'],
            reasonShort: 'חפיפה ברורה.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Shared playfulness')).toBeNull();
    });

    it('renders Expansion-03 tension chip from API as-is (English)', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Mixed fit on playfulness.',
            tensionChip: 'Playfulness mismatch',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Playfulness mismatch')).toBeTruthy();
    });
  });

  describe('MatchWhySection Expansion-04 chips', () => {
    it('EN — Mental stimulation shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence = enCopy.matches.list.browse.chipEvidence['Mental stimulation'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Mental stimulation'],
            reasonShort: 'Strong intellectual overlap.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Mental stimulation')).toBeNull();
    });

    it('HE — Creative expression shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Creative expression'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Creative expression'],
            reasonShort: 'חפיפה ברורה.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Creative expression')).toBeNull();
    });

    it('renders Expansion-04 tension chip from API as-is (English)', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Mixed fit on mental stimulation.',
            tensionChip: 'Different mental stimulation needs',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Different mental stimulation needs')).toBeTruthy();
    });
  });

});
