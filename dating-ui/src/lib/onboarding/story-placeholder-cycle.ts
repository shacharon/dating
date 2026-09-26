export type StoryPlaceholderField = 'aboutMe' | 'aboutPartner' | 'aboutRelationship';

/** Two lines per language, then the next language. After Russian the loop returns to English. */
const ORDER = ['he', 'he', 'en', 'en', 'ar', 'ar', 'ru', 'ru'] as const;

const LINES: Record<StoryPlaceholderField, Record<(typeof ORDER)[number], [string, string]>> = {
  aboutMe: {
    he: [
      'למשל: מסעדה איטלקית, 300 מטר ממני, בשנקין. אני אליזה.',
      'למשל: רצה בבוקר, ואז קפה. עובדת בעיצוב בתל אביב.',
    ],
    en: [
      'e.g. Italian restaurant, 300 meters away, on Shenkin. I\'m Aliza.',
      'e.g. I run in the morning, then coffee. I design things in Tel Aviv.',
    ],
    ar: [
      'مثلاً: مطعم إيطالي، على بعد 300 متر، في شنكين. أنا أليزا.',
      'مثلاً: أركض الصباح، وبعدين قهوة. أشتغل تصميم في تل أبيب.',
    ],
    ru: [
      'например: итальянский ресторан в 300 метрах, на Шенкин. Я Ализа.',
      'например: утром бегаю, потом кофе. Делаю дизайн в Тель-Авиве.',
    ],
  },
  aboutPartner: {
    he: [
      'למשל: מישהו שאוהב לאכול בחוץ ולא ממהר הביתה.',
      'למשל: אדם חם, שמדבר ישר, ובסדר עם ערב שקט.',
    ],
    en: [
      'e.g. Someone who likes eating out and is in no rush to go home.',
      'e.g. Warm, says what they mean, fine with a quiet night.',
    ],
    ar: [
      'مثلاً: شخص يحب يطلع يأكل، ومش مستعجل يرجع.',
      'مثلاً: دافي، يقول اللي جواه، ومرتاح بليلة هادية.',
    ],
    ru: [
      'например: кто любит поесть не дома и не спешит уходить.',
      'например: тёплый, говорит прямо, и ему ок тихий вечер.',
    ],
  },
  aboutRelationship: {
    he: [
      'למשל: קשר יציב. נפגשים באמצע השבוע, בלי משחקים.',
      'למשל: משהו רציני לאט. הודעה בבוקר, דייט בשישי.',
    ],
    en: [
      'e.g. Something steady. We meet midweek. No games.',
      'e.g. Serious, but slow. A text in the morning, a date on Friday.',
    ],
    ar: [
      'مثلاً: علاقة ثابتة. نلتقي وسط الأسبوع. بدون ألعاب.',
      'مثلاً: جدّي بس بهدوء. رسالة الصبح، وموعد يوم الجمعة.',
    ],
    ru: [
      'например: что-то стабильное. Встречаемся среди недели. Без игр.',
      'например: серьёзно, но не спеша. Утром сообщение, в пятницу свидание.',
    ],
  },
};

export const STORY_PLACEHOLDER_STEP_COUNT = ORDER.length;

function stepIndex(step: number): number {
  const count = ORDER.length;
  return ((step % count) + count) % count;
}

export function storyPlaceholderDir(step: number): 'rtl' | 'ltr' {
  const lang = ORDER[stepIndex(step)];
  return lang === 'he' || lang === 'ar' ? 'rtl' : 'ltr';
}

export function storyPlaceholder(field: StoryPlaceholderField, step: number): string {
  const index = stepIndex(step);
  const lang = ORDER[index];
  const pairIndex = ORDER.slice(0, index).filter((item) => item === lang).length;
  return LINES[field][lang][pairIndex];
}
