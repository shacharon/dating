export const SUPPORTED_LOCALES = ["en", "es", "he"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export type OnboardingWritingPromptField = {
  questions: string[];
  examples: string[];
  include: string[];
  avoid: string[];
  tone: string[];
};

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
    brand: string;
    title: string;
    subtitle: string;
    checkingSession: string;
    googleSignIn: string;
    signingIn: string;
    retryApi: string;
    privacyLink: string;
    termsLink: string;
    trust: {
      privacy: string;
      moderation: string;
      compatibility: string;
    };
    how: {
      title: string;
      step1Title: string;
      step1Body: string;
      step2Title: string;
      step2Body: string;
      step3Title: string;
      step3Body: string;
    };
    benefits: {
      title: string;
      depthTitle: string;
      depthBody: string;
      signalsTitle: string;
      signalsBody: string;
      safetyTitle: string;
      safetyBody: string;
    };
    closing: {
      title: string;
      subtitle: string;
      cta: string;
    };
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
      updatedPrefix: string;
      staleRegionAria: string;
      staleMessage: string;
      refreshAnalysis: string;
      refreshStarted: string;
      refreshFailed: string;
      loadFailed: string;
      photoGate: {
        title: string;
        body: string;
        bodyPending: string;
        cta: string;
      };
      actionBadge: {
        liked: { label: string; ariaLabel: string };
        passed: { label: string; ariaLabel: string };
        blocked: { label: string; ariaLabel: string };
      };
      hardBlocked: {
        badge: string;
        badgeAria: string;
        youLikedThisProfile: string;
        moreReasonsCount: (count: number) => string;
        smokingExcludedViewerToThem: string;
        smokingExcludedThemToViewer: string;
        smokingRequiredViewerToThem: string;
        smokingRequiredThemToViewer: string;
        ageViewerToThem: string;
        ageThemToViewer: string;
        genderViewerToThem: string;
        genderThemToViewer: string;
        proximityViewerToThem: string;
        proximityThemToViewer: string;
        genericViewerToThem: string;
        genericThemToViewer: string;
        evidenceBoth: (viewerQuote: string, counterpartyQuote: string) => string;
        evidenceViewer: (viewerQuote: string) => string;
        evidenceCounterparty: (counterpartyQuote: string) => string;
      };
      browse: {
        whyToggle: string;
        whyToggleWithScore: (score: number) => string;
        whyHeading: string;
        whyEmpty: string;
        viewProfile: string;
      };
      priority: {
        highTitle: string;
        highDescription: string;
        goodTitle: string;
        otherTitle: string;
        count: (n: number) => string;
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
      updatedPrefix: string;
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
      hardBlocked: {
        banner: string;
        reasonsHeading: string;
        reviewPreferences: string;
        actionsDisabled: string;
        youLikedThisProfile: string;
        smokingExcludedViewerToThem: string;
        smokingExcludedThemToViewer: string;
        smokingRequiredViewerToThem: string;
        smokingRequiredThemToViewer: string;
        ageViewerToThem: string;
        ageThemToViewer: string;
        genderViewerToThem: string;
        genderThemToViewer: string;
        proximityViewerToThem: string;
        proximityThemToViewer: string;
        genericViewerToThem: string;
        genericThemToViewer: string;
        evidenceBoth: (viewerQuote: string, counterpartyQuote: string) => string;
        evidenceViewer: (viewerQuote: string) => string;
        evidenceCounterparty: (counterpartyQuote: string) => string;
      };
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
      /** Include trailing space, e.g. "You: " */
      youPrefix: string;
      noMessagesYet: string;
      searchPlaceholder: string;
      searchClear: string;
      searchAria: string;
      filterLabel: string;
      filterAria: string;
      filterAll: string;
      filterUnread: string;
      filterRecent: string;
      sortLabel: string;
      sortAria: string;
      sortRecent: string;
      sortAlphabetical: string;
      filteredEmptyTitle: string;
      filteredEmptyBody: string;
      loadMore: string;
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
    accountMenuLabel: string;
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
    brand: string;
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
    mainAria: string;
    primaryAria: string;
    conversationsUnreadLabel: (count: number) => string;
    matchesNewLabel: (count: number) => string;
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
    header: {
      exit: string;
      skip: string;
      aria: string;
    };
    stepBasic: string;
    stepTexts: string;
    exitDialog: {
      title: string;
      body: string;
      cancel: string;
      confirm: string;
    };
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
      writingHelp: {
        ideasHeading: string;
        showExamples: string;
        hideExamples: string;
        showTips: string;
        hideTips: string;
        exampleLabel: (n: number) => string;
        includeHeading: string;
        avoidHeading: string;
        toneHeading: string;
        wordCountLine: (words: number) => string;
      };
    };
    writingPrompts: {
      aboutMe: OnboardingWritingPromptField;
      aboutPartner: OnboardingWritingPromptField;
      aboutRelationship: OnboardingWritingPromptField;
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
      analysisLinkCta: (label: string) => string;
      backToOnboarding: string;
      noProfileBody: string;
      editLink: string;
      findMatchesLink: string;
      emptyValue: string;
    };
    hub: {
      title: string;
      tabOverview: string;
      tabEdit: string;
      tabAnalysis: string;
      tabSettings: string;
      tablistAria: string;
      editProfileCta: string;
      meterLabel: string;
      meterImprove: string;
      meterLoading: string;
      meterUnavailable: string;
      settingsNotificationsHeading: string;
      settingsMatchPrefsHeading: string;
      settingsMatchPrefsBody: string;
      settingsMatchPrefsCta: string;
      settingsAccountHeading: string;
      settingsAccountLink: string;
      settingsLanguageLink: string;
      editSectionBasic: string;
      editSectionStory: string;
      editSectionPhotos: string;
      suggestionPhoto: string;
      suggestionBasics: string;
      suggestionNickname: string;
      suggestionLocation: string;
      suggestionAboutMe: string;
      suggestionAboutPartner: string;
      suggestionAboutRelationship: string;
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
    };
    fields: {
      partnerGendersHelp: string;
      ageMin: string;
      ageMax: string;
      maxDistanceKm: string;
    };
    partnerGender: Record<"MALE" | "FEMALE" | "NON_BINARY" | "OTHER" | "PREFER_NOT_TO_SAY", string>;
    inferredDealbreakers: {
      title: string;
      disclaimer: string;
      empty: string;
      dealbreakerLine: (quote: string) => string;
      requirementLine: (quote: string) => string;
      editStoryCta: string;
    };
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
  profilePhotos: {
    title: string;
    upload: string;
    hint: string;
    loading: string;
    limitReached: string;
    empty: string;
    uploading: string;
    uploadingPreviewAlt: string;
    noPreview: string;
    primary: string;
    delete: string;
    setPrimary: string;
    photoAlt: (position: number) => string;
    loadFailed: string;
    uploadFailed: string;
    deleteFailed: string;
    setPrimaryFailed: string;
  };
  photoModeration: {
    statusPending: string;
    statusApproved: string;
    statusRejected: string;
    statusFlagged: string;
    rejectionPrefix: string;
    rejectionReasons: {
      no_face: string;
      explicit_content: string;
      low_quality: string;
      not_real_person: string;
      other: string;
    };
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
  error: {
    dating: {
      title: string;
      message: string;
    };
    authenticated: {
      title: string;
      message: string;
    };
    retry: string;
  };
  contentModeration: {
    profileTitle: string;
    messageTitle: string;
    fieldLabel: string;
    flaggedLabel: string;
    whyLabel: string;
    suggestionLabel: string;
    exampleLabel: string;
    mutedLabel: string;
    dismiss: string;
    messagingMuted: string;
    categoryDatingPolicy: string;
  };
};
