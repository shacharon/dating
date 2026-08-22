type Props = {
  surface: string;
  setSurface: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  action: string;
  setAction: (value: string) => void;
  userStatus: string;
  setUserStatus: (value: string) => void;
  hasRecipient: string;
  setHasRecipient: (value: string) => void;
  userId: string;
  setUserId: (value: string) => void;
};

export function ContentViolationsFilters({
  surface,
  setSurface,
  category,
  setCategory,
  action,
  setAction,
  userStatus,
  setUserStatus,
  hasRecipient,
  setHasRecipient,
  userId,
  setUserId,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Surface
        <select
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All</option>
          <option value="message">message</option>
          <option value="profile_aboutMe">profile_aboutMe</option>
          <option value="profile_aboutPartner">profile_aboutPartner</option>
          <option value="profile_aboutRelationship">
            profile_aboutRelationship
          </option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All</option>
          <option value="sexual">sexual</option>
          <option value="hate">hate</option>
          <option value="harassment">harassment</option>
          <option value="violence">violence</option>
          <option value="self-harm">self-harm</option>
          <option value="dating_policy">dating_policy</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Action
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All</option>
          <option value="blocked">blocked</option>
          <option value="warned">warned</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Status
        <select
          value={userStatus}
          onChange={(e) => setUserStatus(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All</option>
          <option value="ok">ok</option>
          <option value="profile_edit_blocked">profile_edit_blocked</option>
          <option value="messaging_muted">messaging_muted</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Has recipient
        <select
          value={hasRecipient}
          onChange={(e) => setHasRecipient(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All</option>
          <option value="1">Yes</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        User ID
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Exact user id"
          className="min-w-[14rem] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
    </div>
  );
}
