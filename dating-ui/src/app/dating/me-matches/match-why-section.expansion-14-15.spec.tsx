/** @vitest-environment jsdom */
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { getCopy } from '@/lib/i18n';
import { MatchWhySection } from './match-why-section';
import { baseMatch } from './match-why-section.spec-support';

afterEach(() => {
  cleanup();
});

describe('MatchWhySection expansion chips (14-15)', () => {
  describe('MatchWhySection Expansion-14 chips', () => {
    it('EN — Patience match shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence = enCopy.matches.list.browse.chipEvidence['Patience match'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Patience match'],
            reasonShort: 'Both patient with quirks.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Patience match')).toBeNull();
    });

    it('HE — Pace of closeness shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Pace of closeness'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Pace of closeness'],
            reasonShort: 'Similar pace.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Pace of closeness')).toBeNull();
    });

    it('EN — Aligned on relationship structure shows evidence', () => {
      const enCopy = getCopy('en');
      const evidence =
        enCopy.matches.list.browse.chipEvidence[
          'Aligned on relationship structure'
        ];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Aligned on relationship structure'],
            reasonShort: 'Aligned on exclusivity.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Aligned on relationship structure')).toBeNull();
    });

    it('includes Expansion-14 onboarding writing prompts in EN/HE/ES', () => {
      expect(getCopy('en').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          "Something about my partner that would test my patience, and how I'd handle it…",
          'How fast do you like to move emotionally/physically in a new relationship?',
          'What does an exclusive relationship mean to you?',
        ]),
      );
      expect(getCopy('he').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'משהו בבן/בת הזוג שהיה מאתגר את הסבלנות שלי, ואיך הייתי מתמודד/ת...',
          'כמה מהר את/ה אוהב/ת להתקדם רגשית/פיזית בקשר חדש?',
          'מה זוגיות בלעדית אומרת עבורך?',
        ]),
      );
      expect(getCopy('es').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'Algo de mi pareja que pondría a prueba mi paciencia, y cómo lo manejaría…',
          '¿Qué tan rápido te gusta avanzar emocional/físicamente en una relación nueva?',
          '¿Qué significa para ti una relación exclusiva?',
        ]),
      );
    });

    it('renders Expansion-14 Relationship structure mismatch tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Structure mismatch.',
            tensionChip: 'Relationship structure mismatch',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Relationship structure mismatch')).toBeTruthy();
    });

    it('renders Expansion-14 Different tolerance levels tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Tolerance gap.',
            tensionChip: 'Different tolerance levels',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Different tolerance levels')).toBeTruthy();
    });

    it('renders Expansion-14 Different pace to closeness tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Pacing clash.',
            tensionChip: 'Different pace to closeness',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Different pace to closeness')).toBeTruthy();
    });
  });

  describe('MatchWhySection Expansion-15 chips', () => {
    it('EN — Family style match shows evidence not raw chip label', () => {
      const enCopy = getCopy('en');
      const evidence =
        enCopy.matches.list.browse.chipEvidence['Family style match'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Family style match'],
            reasonShort: 'Similar family style.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Family style match')).toBeNull();
    });

    it('HE — Friends & couple balance shows Hebrew evidence', () => {
      const heCopy = getCopy('he');
      const evidence =
        heCopy.matches.list.browse.chipEvidence['Friends & couple balance'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Friends & couple balance'],
            reasonShort: 'Similar friends/couple balance.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={heCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Friends & couple balance')).toBeNull();
    });

    it('EN — Recharge style match shows evidence', () => {
      const enCopy = getCopy('en');
      const evidence =
        enCopy.matches.list.browse.chipEvidence['Recharge style match'];
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: ['Recharge style match'],
            reasonShort: 'Similar recharge needs.',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText(evidence)).toBeTruthy();
      expect(screen.queryByText('Recharge style match')).toBeNull();
    });

    it('includes Expansion-15 onboarding writing prompts in EN/HE/ES', () => {
      expect(getCopy('en').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'How involved is your family in your day-to-day decisions?',
          'A great weekend for me balances friends, alone time, and us time like…',
          'How do you recharge after a long week?',
        ]),
      );
      expect(getCopy('he').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          'כמה המשפחה שלך מעורבת בהחלטות היומיומיות שלך?',
          'סוף שבוע מושלם בשבילי מאזן בין חברים, זמן לבד וזמן ביחד ב...',
          'איך את/ה נטען/ת מחדש אחרי שבוע ארוך?',
        ]),
      );
      expect(getCopy('es').onboarding.writingPrompts.aboutMe.questions).toEqual(
        expect.arrayContaining([
          '¿Cuánto se involucra tu familia en tus decisiones del día a día?',
          'Un gran fin de semana para mí equilibra amigos, tiempo a solas y tiempo juntos así…',
          '¿Cómo recargas energías después de una semana larga?',
        ]),
      );
    });

    it('renders Expansion-15 Family involvement gap tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Family gap.',
            tensionChip: 'Family involvement gap',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Family involvement gap')).toBeTruthy();
    });

    it('renders Expansion-15 Friends vs couple time tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Friends vs couple.',
            tensionChip: 'Friends vs couple time',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Friends vs couple time')).toBeTruthy();
    });

    it('renders Expansion-15 Different alone-time needs tension chip as-is', () => {
      const enCopy = getCopy('en');
      render(
        <MatchWhySection
          match={baseMatch({
            positiveChips: [],
            reasonShort: 'Alone-time gap.',
            tensionChip: 'Different alone-time needs',
          })}
          open
          onOpenChange={() => {}}
          listCopy={enCopy.matches.list}
        />,
      );
      expect(screen.getByText('Different alone-time needs')).toBeTruthy();
    });
  });
});
