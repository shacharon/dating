'use client';

export type EditSectionId = 'basic' | 'photos' | 'preferences' | 'story';

type Props = {
  active: EditSectionId;
  labels: { basic: string; photos: string; preferences: string; story: string };
  complete: { basic: boolean; photos: boolean; preferences: boolean; story: boolean };
  onNavigate: (id: EditSectionId) => void;
};

const ORDER: EditSectionId[] = ['story', 'basic', 'preferences', 'photos'];

/**
 * Sticky Story / Basic / Preferences / Photos nav with completion progress dots.
 */
export function ProfileEditSectionNav({
  active,
  labels,
  complete,
  onNavigate,
}: Props) {
  const doneCount = ORDER.filter((id) => complete[id]).length;

  return (
    <div
      className="sticky top-0 z-20 -mx-1 mb-6 border-b border-zinc-200 bg-zinc-50/95 px-1 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95"
      data-testid="profile-edit-section-nav"
    >
      <nav
        className="flex flex-wrap gap-1 sm:gap-4"
        aria-label="Edit profile sections"
      >
        {ORDER.map((id) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              data-testid={`profile-edit-nav-${id}`}
              data-section={id}
              onClick={() => onNavigate(id)}
              aria-current={selected ? 'page' : undefined}
              className={`min-h-11 border-b-2 px-2 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${
                selected
                  ? 'border-blue-600 font-semibold text-zinc-900 dark:border-blue-400 dark:text-zinc-100'
                  : 'border-transparent font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {labels[id]}
            </button>
          );
        })}
      </nav>
      <div
        className="mt-2 flex items-center gap-2"
        data-testid="profile-edit-progress-dots"
        aria-label={`${doneCount} of 4 sections complete`}
      >
        {ORDER.map((id) => (
          <span
            key={id}
            data-testid={`profile-edit-progress-${id}`}
            data-complete={complete[id] ? 'true' : 'false'}
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              complete[id]
                ? 'bg-emerald-500 dark:bg-emerald-400'
                : 'border-2 border-zinc-300 bg-transparent dark:border-zinc-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
