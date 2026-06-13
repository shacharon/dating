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
    conversationsUnreadLabel: (count: number) => string;
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
  profile: {
    notifications: {
      notificationsTitle: string;
      inAppLabel: string;
      inAppHelp: string;
      emailLabel: string;
      emailHelp: string;
      saveError: string;
    };
    matchPreferencesLink: string;
    matchPreferencesLinkHelp: string;
  };
  matchPreferences: {
    title: string;
    subtitle: string;
    saveSuccess: string;
    saveHint: string;
    saveError: string;
    ageRangeInvalid: string;
    partnerGendersRequired: string;
    noProfile: string;
    goToOnboarding: string;
    sections: {
      partnerGenders: string;
      age: string;
      distance: string;
      education: string;
      lifestyle: string;
      family: string;
      similarity: string;
    };
    fields: {
      partnerGendersHelp: string;
      ageMin: string;
      ageMax: string;
      maxDistanceKm: string;
      minimumPartnerEducation: string;
      partnerWantsChildren: string;
      partnerHasChildren: string;
      similarityPreference: string;
      multiSelectHelp: string;
      smokingGroup: string;
      alcoholGroup: string;
      religionGroup: string;
      notSpecified: string;
    };
    partnerGender: Record<"MALE" | "FEMALE" | "NON_BINARY" | "OTHER", string>;
    education: Record<
      "ANY" | "HIGH_SCHOOL" | "SOME_COLLEGE" | "BACHELORS" | "GRADUATE",
      string
    >;
    smoking: Record<"NONE_ONLY" | "SOCIAL_OK" | "ANY", string>;
    alcohol: Record<"NONE_ONLY" | "MODERATE_OK" | "ANY", string>;
    wantsChildren: Record<
      "MUST_WANT" | "MUST_NOT_WANT" | "NO_REQUIREMENT",
      string
    >;
    hasChildren: Record<
      "ACCEPT" | "DOES_NOT_ACCEPT" | "NO_REQUIREMENT",
      string
    >;
    religion: Record<
      | "NONE"
      | "CHRISTIAN"
      | "JEWISH"
      | "MUSLIM"
      | "HINDU"
      | "BUDDHIST"
      | "SPIRITUAL_NON_AFFILIATED"
      | "OTHER",
      string
    >;
    similarity: Record<"similar" | "different" | "balanced", string>;
  };
  reportUser: {
    linkLabel: string;
    title: string;
    reasonLabel: string;
    detailsLabel: string;
    detailsPlaceholder: string;
    detailsHelp: string;
    confirm: (name: string, reason: string) => string;
    submit: string;
    continue: string;
    cancel: string;
    close: string;
    success: string;
    saveError: string;
    duplicateError: string;
    reasons: Record<
      | "HARASSMENT"
      | "SPAM"
      | "FAKE_PROFILE"
      | "INAPPROPRIATE_CONTENT"
      | "OTHER",
      string
    >;
  };
  accountSettings: {
    title: string;
    subtitle: string;
    legalSectionTitle: string;
    privacyLink: string;
    termsLink: string;
    notificationsSectionTitle: string;
    notificationsLink: string;
  };
  deleteAccount: {
    title: string;
    description: string;
    confirmationLabel: string;
    confirmationPlaceholder: string;
    submit: string;
    submitting: string;
    saveError: string;
    confirmationInvalid: string;
  };
  photoGate: {
    bannerMessage: string;
    bannerLink: string;
    requiredForMatchingHint: string;
  };
  photoModeration: {
    statusPending: string;
    statusApproved: string;
    statusRejected: string;
    rejectionPrefix: string;
  };
  profileCompleteness: {
    title: string;
    photo: string;
    basics: string;
    story: string;
    complete: string;
    incomplete: string;
  };
  analysisProgress: {
    title: string;
    submittedStep: string;
    analyzingStep: string;
    waitHint: string;
    editProfileLink: string;
    addPhotoLink: string;
    failedTitle: string;
    retryButton: string;
    redirecting: string;
  };
  launch: {
    emptyMatches: {
      title: string;
      bodyWithPlace: (place: string) => string;
      bodyGeneric: string;
      filterHint: string;
      editPreferences: string;
      editProfile: string;
      inviteCopyLink: string;
      inviteCopied: string;
    };
    matchDetail: {
      matchScoreLabel: (score: number) => string;
      feedback: {
        prompt: string;
        thanks: string;
        positiveLabel: string;
        negativeLabel: string;
      };
    };
  };
};
