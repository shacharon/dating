export const SUPPORTED_LOCALES = ["en", "es"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

/**
 * Minimal, typed copy contract for gradual migration from hardcoded strings.
 * Keep this intentionally small and expand only when wiring new surfaces.
 */
export type AppCopySchema = {
  common: {
    loading: string;
    save: string;
    cancel: string;
  };
  nav: {
    home: string;
    matches: string;
    conversations: string;
    profile: string;
    analysis: string;
    accountSettings: string;
    editBasicProfile: string;
    editStoryProfile: string;
    language: string;
    logout: string;
  };
  onboarding: {
    basicsTitle: string;
    basicsSubtitle: string;
    storyTitle: string;
    storySubtitle: string;
  };
  notifications: {
    messageToast: (name: string) => string;
    messageToastAction: string;
    messageToastDismiss: string;
  };
};
