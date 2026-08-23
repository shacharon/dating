/** @vitest-environment jsdom */
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { getCopy } from '@/lib/i18n';
import { MatchWhySection } from './match-why-section';
import { baseMatch } from './match-why-section.spec-support';

afterEach(() => {
  cleanup();
});

describe('MatchWhySection expansion chips (05-09)', () => {
  describe('MatchWhySection Expansion-05 chips', () => {
    it('EN — Activity level match shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence =
        enCopy.matches.list.browse.chipEvidence['Activity level match'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Activity level match'],
            reasonShort: 'Strong activity overlap.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Activity level match')).toBeNull();
    });

    it('HE — Home/out balance shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Home/out balance'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Home/out balance'],
            reasonShort: 'חפיפה ברורה.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Home/out balance')).toBeNull();
    });

    it('renders Expansion-05 tension chip from API as-is (English)', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Mixed fit on activity levels.',
            tensionChip: 'Different activity levels',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Different activity levels')).toBeTruthy();
    });
  });

  describe('MatchWhySection Expansion-06 chips', () => {
    it('EN — Adventure & novelty shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence =
        enCopy.matches.list.browse.chipEvidence['Adventure & novelty'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Adventure & novelty'],
            reasonShort: 'Strong novelty overlap.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Adventure & novelty')).toBeNull();
    });

    it('HE — Adventure & novelty shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Adventure & novelty'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Adventure & novelty'],
            reasonShort: 'חפיפה ברורה.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Adventure & novelty')).toBeNull();
    });

    it('renders Expansion-06 tension chip from API as-is (English)', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Mixed fit on novelty vs routine.',
            tensionChip: 'Novelty vs routine',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Novelty vs routine')).toBeTruthy();
    });
  });

  describe('MatchWhySection Expansion-07 chips', () => {
    it('EN — Intimacy expectations shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence =
        enCopy.matches.list.browse.chipEvidence['Intimacy expectations'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Intimacy expectations'],
            reasonShort: 'Aligned intimacy stance.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Intimacy expectations')).toBeNull();
    });

    it('renders interest overlap chips with distinct testid', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Shared hobbies.',
            interestOverlapTags: ['travel', 'books'],
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByTestId('match-why-interest-chips')).toBeTruthy();
      expect(screen.getByText('You both love travel')).toBeTruthy();
      expect(screen.getByText('You both enjoy reading')).toBeTruthy();
    });

    it('renders Expansion-09 interest overlap chips with EN i18n', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Shared outdoor hobbies.',
            interestOverlapTags: ['biking', 'camping'],
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByTestId('match-why-interest-chips')).toBeTruthy();
      expect(screen.getByText('You both enjoy biking')).toBeTruthy();
      expect(screen.getByText('You both enjoy camping')).toBeTruthy();
    });

    it('renders Expansion-09 nature interest overlap chip', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Shared nature love.',
            interestOverlapTags: ['nature'],
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('You both love nature')).toBeTruthy();
    });

    it('exposes Expansion-09 interestOverlap keys in HE copy', () => {
      const he = getCopy('he').matches.list.browse.interestOverlap;
      expect(he.biking).toBe('שניכם נהנים מרכיבה על אופניים');
      expect(he.camping).toBe('שניכם נהנים מקמפינג');
      expect(he.nature).toBe('שניכם אוהבים טבע');
    });

    it('exposes Expansion-09 interestOverlap keys in ES copy', () => {
      const es = getCopy('es').matches.list.browse.interestOverlap;
      expect(es.biking).toBe('A ambos les gusta andar en bici');
      expect(es.camping).toBe('A ambos les gusta acampar');
      expect(es.nature).toBe('A ambos les encanta la naturaleza');
    });

    it('renders Expansion-07 tension chip from API as-is (English)', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Mixed fit on intimacy stance.',
            tensionChip: 'Casual vs committed intimacy',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Casual vs committed intimacy')).toBeTruthy();
    });
  });

});
