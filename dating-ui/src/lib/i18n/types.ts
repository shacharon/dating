export const SUPPORTED_LOCALES = ["en", "es", "he"] as const;

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
    syncingSession: string;
    checkingSession: string;
  };
  landing: {
    title: string;
    subtitle: string;
    checkingSession: string;
    googleSignIn: string;
    signingIn: string;
    retryApi: string;
    privacyLink: string;
    termsLink: string;
  };
  languageSettings: {
    title: string;
    label: string;
    description: string;
    optionEn: string;
    optionEs: string;
    optionHe: string;
  };
  appShell: {
    apiUnreachableTitle: string;
    retryConnection: string;
    redirecting: string;
  };
  matches: {
    list: {
      backToAnalysis: string;
      editProfile: string;
      title: string;
      subtitle: string;
      analyzedPrefix: string;
      staleRegionAria: string;
      staleMessage: string;
      refreshAnalysis: string;
      refreshStarted: string;
      refreshFailed: string;
      loadFailed: string;
      actionBadge: {
        liked: { label: string; ariaLabel: string };
        passed: { label: string; ariaLabel: string };
        blocked: { label: string; ariaLabel: string };
      };
    };
    detail: {
      backToMatches: string;
      matchLabel: string;
      whyYouMatch: string;
      traitStrong: string;
      traitModerate: string;
      aboutThem: string;
      noSummary: string;
      analyzedPrefix: string;
      youMatched: string;
      viewConversation: string;
      actionStatus: {
        liked: string;
        passed: string;
        blocked: string;
      };
      undoLikeAria: string;
      undoPassAria: string;
      saving: string;
      undo: string;
      like: string;
      pass: string;
      block: string;
      blockConfirm: string;
      blockPermanently: string;
      backToMatchesButton: string;
      loadFailed: string;
      likeFailed: string;
      passFailed: string;
      undoFailed: string;
      feedbackFailed: string;
      blockFailed: string;
    };
    celebration: {
      title: string;
      sendMessage: string;
      closeAria: string;
    };
  };
  conversations: {
    format: {
      matchedTodayAt: (time: string) => string;
      matchedYesterday: string;
      matchedDaysAgo: (days: number) => string;
      matchedOn: (date: string) => string;
      justNow: string;
      minutesAgo: (minutes: number) => string;
      yesterdayAt: (time: string) => string;
    };
    list: {
      backToMatches: string;
      title: string;
      subtitle: string;
      tryAgain: string;
      emptyTitle: string;
      emptyBody: string;
      browseMatches: string;
      unreadAria: (count: number) => string;
      loadFailed: string;
    };
    detail: {
      backToList: string;
      messagingAria: string;
      reconnecting: string;
      loadingMessages: string;
      loadEarlier: string;
      emptyMessages: string;
      messageLabel: string;
      messagePlaceholder: string;
      send: string;
      sending: string;
      unmatch: string;
      unmatchConfirm: (name: string) => string;
      loadFailed: string;
      unmatchFailed: string;
      loadMessagesFailed: string;
      loadEarlierFailed: string;
      sendFailed: string;
    };
  };
  navAuth: {
    apiUnreachable: string;
    dismiss: string;
    signIn: string;
    accountMenuAria: string;
  };
  datingHub: {
    title: string;
    subtitle: string;
    getStarted: string;
    viewMatches: string;
  };
  analysisPage: {
    loading: string;
    loadFailed: string;
    loadFailedHint: string;
    reRunAnalysis: string;
    analysisRunning: string;
    lastRunPrefix: string;
    sectionHowWeRead: string;
    sectionWhatYouWrote: string;
    insightAboutYou: string;
    insightHowYouRelate: string;
    insightWhoYouWant: string;
    referenceAboutMe: string;
    referenceRelationshipStyle: string;
    referencePartnerPreference: string;
    referenceEmpty: string;
    showMore: string;
    showLess: string;
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
  gender: {
    MALE: string;
    FEMALE: string;
    NON_BINARY: string;
    OTHER: string;
    PREFER_NOT_TO_SAY: string;
  };
  onboarding: {
    basicsTitle: string;
    basicsSubtitle: string;
    storyTitle: string;
    storySubtitle: string;
    syncingProfile: string;
    loadFailed: string;
    saveFailed: string;
    savedFlash: string;
    saveProgress: string;
    continueLater: string;
    basicForm: {
      sectionTitle: string;
      googleNameLabel: string;
      googleNameHelp: string;
      nicknameLabel: string;
      nicknamePlaceholder: string;
      birthDateLabel: string;
      ageDisplay: (age: number) => string;
      genderLabel: string;
      genderSelectPlaceholder: string;
      partnerGendersLegend: string;
      partnerGendersRequiredHint: string;
      partnerGendersRequiredError: string;
      genderRequiredError: (preferNotToSay: string) => string;
      cityLabel: string;
      cityPlaceholder: string;
      countryLabel: string;
      countryPlaceholder: string;
      locationLabelLabel: string;
      locationLabelPlaceholder: string;
      continueToStory: string;
    };
    textsForm: {
      intro: string;
      aboutMeLabel: string;
      aboutMePlaceholder: string;
      aboutPartnerLabel: string;
      aboutPartnerPlaceholder: string;
      aboutRelationshipLabel: string;
      aboutRelationshipPlaceholder: string;
      finishAndAnalyze: string;
      submitting: string;
      backToBasics: string;
      genderMissingError: string;
      verifyFailedError: string;
      finishFailedError: string;
    };
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
    viewPage: {
      titleProfile: string;
      titleReview: string;
      subtitle: string;
      matchingSectionTitle: string;
      matchPreferencesLinkCta: (label: string) => string;
      backToOnboarding: string;
      noProfileBody: string;
      editLink: string;
      findMatchesLink: string;
      emptyValue: string;
    };
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
