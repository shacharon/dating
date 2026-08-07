'use client';

export type DatingChapterValue =
  | 'first_chapter'
  | 'ready_again'
  | 'new_chapter';

export const DATING_CHAPTER_VALUES: readonly DatingChapterValue[] = [
  'first_chapter',
  'ready_again',
  'new_chapter',
] as const;

export type DatingChapterCopy = {
  question: string;
  helper: string;
  first_chapter: string;
  ready_again: string;
  new_chapter: string;
  newChapterSubtext: string;
};

type DatingChapterFieldsProps = {
  copy: DatingChapterCopy;
  value: DatingChapterValue | null;
  onChange: (next: DatingChapterValue | null) => void;
  disabled?: boolean;
  /** When true, show a clear/unset control (settings). */
  allowClear?: boolean;
  clearLabel?: string;
  name?: string;
};

/** Shared radios for dating-chapter intent (onboarding + settings). */
export function DatingChapterFields({
  copy,
  value,
  onChange,
  disabled = false,
  allowClear = false,
  clearLabel = 'Use age-based default',
  name = 'datingChapter',
}: DatingChapterFieldsProps) {
  return (
    <fieldset
      className="space-y-3"
      data-testid="dating-chapter-fields"
      disabled={disabled}
    >
      <legend className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {copy.question}
      </legend>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{copy.helper}</p>
      <div className="space-y-2">
        {DATING_CHAPTER_VALUES.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-start gap-3 text-sm text-zinc-900 dark:text-zinc-100"
          >
            <input
              type="radio"
              name={name}
              value={option}
              data-testid={`dating-chapter-${option}`}
              checked={value === option}
              disabled={disabled}
              onChange={() => onChange(option)}
              className="mt-0.5 border-zinc-400 text-zinc-900 dark:border-zinc-500"
            />
            <span>
              <span className="font-medium">{copy[option]}</span>
              {option === 'new_chapter' ? (
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  {copy.newChapterSubtext}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {allowClear ? (
        <button
          type="button"
          data-testid="dating-chapter-clear"
          disabled={disabled || value == null}
          onClick={() => onChange(null)}
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:underline disabled:opacity-40 dark:text-zinc-400"
        >
          {clearLabel}
        </button>
      ) : null}
    </fieldset>
  );
}
