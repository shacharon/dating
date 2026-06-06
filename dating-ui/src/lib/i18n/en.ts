import type { AppCopySchema } from "@/lib/i18n/types";

export const enCopy: AppCopySchema = {
  common: {
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
  },
  nav: {
    home: "Home",
    matches: "Matches",
    conversations: "Conversations",
    profile: "Profile",
    analysis: "Analysis",
    accountSettings: "Account Settings",
    editBasicProfile: "Edit Basic Profile",
    editStoryProfile: "Edit Story Profile",
    language: "Language",
    logout: "Logout",
    conversationsUnreadLabel: (count: number) =>
      `${count} unread message${count === 1 ? "" : "s"}`,
  },
  onboarding: {
    basicsTitle: "Step 1 — Basics",
    basicsSubtitle: "Save anytime; your answers reload from the server when you return.",
    storyTitle: "Step 2 — Your story",
    storySubtitle: "Save a draft, or finish to submit your profile for analysis.",
  },
  notifications: {
    messageToast: (name: string) => `${name} sent you a message`,
    messageToastAction: "View",
    messageToastDismiss: "Dismiss",
  },
  profile: {
    notifications: {
      notificationsTitle: "Notifications",
      inAppLabel: "Show in-app alerts",
      inAppHelp: "Toast when you receive a message while the app is open.",
      emailLabel: "Email me when I'm away",
      emailHelp:
        "Email when you're not online. Unsubscribe link in emails still works.",
      saveError: "Could not save notification settings. Please try again.",
    },
  },
};
