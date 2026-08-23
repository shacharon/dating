/** @vitest-environment jsdom */
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { getCopy } from '@/lib/i18n';
import { MatchWhySection } from './match-why-section';
import { baseMatch } from './match-why-section.spec-support';

afterEach(() => {
  cleanup();
});

describe('MatchWhySection expansion chips (10-13)', () => {
  describe('MatchWhySection Expansion-10 chips', () => {
    it('EN — Conflict recovery shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence =
        enCopy.matches.list.browse.chipEvidence['Conflict recovery'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Conflict recovery'],
            reasonShort: 'Strong repair alignment.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Conflict recovery')).toBeNull();
    });

    it('HE — Letting go & moving forward shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Letting go & moving forward'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Letting go & moving forward'],
            reasonShort: 'Aligned forgiveness pace.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Letting go & moving forward')).toBeNull();
    });

    it('includes Expansion-10 onboarding writing prompts in EN/HE/ES', () => {
      expect(getCopy('en').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'When we disagree, I usually…',
          'After a fight, I tend to…',
        ]),
      );
      expect(getCopy('he').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'כשיש לנו חילוקי דעות, אני בדרך כלל...',
          'אחרי ריב, אני נוטה...',
        ]),
      );
      expect(getCopy('es').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'Cuando discrepamos, normalmente…',
          'Después de una pelea, suelo…',
        ]),
      );
    });

    it('renders Expansion-10 tension chip from API as-is (English)', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Mixed fit on conflict recovery.',
            tensionChip: 'Conflict recovery risk',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Conflict recovery risk')).toBeTruthy();
    });

    it('renders Expansion-10 Different repair styles tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Repair pace clash.',
            tensionChip: 'Different repair styles',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Different repair styles')).toBeTruthy();
    });
  });

  describe('MatchWhySection Expansion-11 chips', () => {
    it('EN — Support under pressure shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence =
        enCopy.matches.list.browse.chipEvidence['Support under pressure'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Support under pressure'],
            reasonShort: 'Compatible stress styles.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Support under pressure')).toBeNull();
    });

    it('HE — Secure & trusting shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Secure & trusting'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Secure & trusting'],
            reasonShort: 'Shared secure stance.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Secure & trusting')).toBeNull();
    });

    it('includes Expansion-11 onboarding writing prompts in EN/HE/ES', () => {
      expect(getCopy('en').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          "When I'm stressed, I need my partner to…",
          'Do you get jealous easily? What helps you feel secure?',
        ]),
      );
      expect(getCopy('he').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'כשאני לחוץ/ה, אני צריך/ה שבן/בת הזוג...',
          'את/ה מתקנא/ת בקלות? מה עוזר לך להרגיש בטוח/ה?',
        ]),
      );
      expect(getCopy('es').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'Cuando estoy estresado/a, necesito que mi pareja…',
          '¿Te pones celoso/a fácilmente? ¿Qué te ayuda a sentirte seguro/a?',
        ]),
      );
    });

    it('renders Expansion-11 tension chip from API as-is (English)', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Mixed fit under stress.',
            tensionChip: 'Pursue vs withdraw under stress',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Pursue vs withdraw under stress')).toBeTruthy();
    });

    it('renders Expansion-11 Shared jealousy risk tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Shared jealousy risk.',
            tensionChip: 'Shared jealousy risk',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Shared jealousy risk')).toBeTruthy();
    });
  });

  describe('MatchWhySection Expansion-12 chips', () => {
    it('EN — Feels heard shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence = enCopy.matches.list.browse.chipEvidence['Feels heard'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Feels heard'],
            reasonShort: 'Both listen with presence.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Feels heard')).toBeNull();
    });

    it('HE — Expressiveness match shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Expressiveness match'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Expressiveness match'],
            reasonShort: 'Compatible expression.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Expressiveness match')).toBeNull();
    });

    it('includes Expansion-12 onboarding writing prompts in EN/HE/ES', () => {
      expect(getCopy('en').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'I feel most loved when my partner…',
          'A partner really listens to me when they…',
        ]),
      );
      expect(getCopy('he').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'אני מרגיש/ה הכי אהוב/ה כש...',
          'בן/בת זוג באמת מקשיב/ה לי כש...',
        ]),
      );
      expect(getCopy('es').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'Me siento más amado/a cuando mi pareja…',
          'Una pareja realmente me escucha cuando…',
        ]),
      );
    });

    it('renders Expansion-12 Different listening styles tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Listening mismatch.',
            tensionChip: 'Different listening styles',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Different listening styles')).toBeTruthy();
    });

    it('renders Expansion-12 Different expression styles tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Expression mismatch.',
            tensionChip: 'Different expression styles',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Different expression styles')).toBeTruthy();
    });
  });

  describe('MatchWhySection Expansion-13 chips', () => {
    it('EN — Grows together shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence = enCopy.matches.list.browse.chipEvidence['Grows together'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Grows together'],
            reasonShort: 'Both value growth.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Grows together')).toBeNull();
    });

    it('HE — Self-awareness match shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Self-awareness match'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Self-awareness match'],
            reasonShort: 'Shared self-insight.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Self-awareness match')).toBeNull();
    });

    it('includes Expansion-13 onboarding writing prompts in EN/HE/ES', () => {
      expect(getCopy('en').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'A time I changed my mind about something important…',
          "One thing I'm working on about myself…",
        ]),
      );
      expect(getCopy('he').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'פעם ששיניתי את דעתי בנושא חשוב...',
          'דבר אחד שאני עובד/ת עליו בעצמי...',
        ]),
      );
      expect(getCopy('es').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'Una vez que cambié de opinión sobre algo importante…',
          'Una cosa en la que estoy trabajando sobre mí…',
        ]),
      );
    });

    it('renders Expansion-13 Different growth pace tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Growth pace mismatch.',
            tensionChip: 'Different growth pace',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Different growth pace')).toBeTruthy();
    });

    it('renders Expansion-13 Self-insight gap tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Shared self-insight risk.',
            tensionChip: 'Self-insight gap',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Self-insight gap')).toBeTruthy();
    });
  });

});
