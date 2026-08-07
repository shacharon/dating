/** @vitest-environment jsdom */
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { getCopy } from '@/lib/i18n';
import type { MeMatchItemDto } from '@/lib/me-matches-api';
import { MatchWhySection } from './match-why-section';

afterEach(() => {
  cleanup();
});

function baseMatch(
  explainability: MeMatchItemDto['explainability'],
): MeMatchItemDto {
  return {
    id: 'prof-expansion-01',
    nickname: 'Test',
    gender: 'FEMALE',
    ageYears: 30,
    locationLabel: 'Tel Aviv',
    analyzedAt: null,
    hasEvaluation: true,
    matchScore: 82,
    explainability,
    recommendation: null,
  };
}

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
