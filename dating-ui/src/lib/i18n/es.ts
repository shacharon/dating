import type { AppCopySchema } from "@/lib/i18n/types";

export const esCopy: AppCopySchema = {
  common: {
    loading: "Cargando…",
    save: "Guardar",
    cancel: "Cancelar",
    syncingSession: "Sincronizando sesion…",
    checkingSession: "Comprobando sesion…",
  },
  landing: {
    brand: "Dating",
    title: "Conexiones con sentido, no deslizamientos sin fin.",
    subtitle:
      "Emparejamiento por compatibilidad con conversaciones moderadas.",
    checkingSession: "Comprobando inicio de sesion…",
    googleSignIn: "Iniciar sesion con Google",
    signingIn: "Iniciando sesion…",
    retryApi: "Reintentar conexion con la API",
    privacyLink: "Privacidad",
    termsLink: "Terminos",
    trust: {
      privacy: "Privacidad por defecto",
      moderation: "Conversaciones moderadas",
      compatibility: "Matches por compatibilidad",
    },
    how: {
      title: "Como funciona",
      step1Title: "Cuenta tu historia",
      step1Body:
        "Comparte lo basico y lo que te importa — guarda el progreso cuando quieras.",
      step2Title: "Recibe matches pensados",
      step2Body:
        "Mostramos personas compatibles segun tu perfil, no un aluvion de tarjetas.",
      step3Title: "Empieza una conversacion real",
      step3Body:
        "Cuando hay interes mutuo, hablan en un espacio de mensajeria moderado.",
    },
    benefits: {
      title: "Por que Dating",
      depthTitle: "Profundidad sobre volumen",
      depthBody:
        "Menos matches, mejores — pensados para compatibilidad, no para fatiga.",
      signalsTitle: "Senales de match claras",
      signalsBody:
        "Entiende por que alguien aparecio — no un feed opaco ”para ti“.",
      safetyTitle: "Conversaciones mas seguras",
      safetyBody:
        "Reportes y moderacion mantienen las charlas respetuosas.",
    },
    closing: {
      title: "Cuando estes listo/a",
      subtitle:
        "Inicia sesion con Google para crear tu perfil y ver matches.",
      cta: "Volver al inicio de sesion",
    },
  },
  languageSettings: {
    title: "Idioma",
    label: "Idioma de la interfaz",
    description:
      "La navegacion, ajustes y flujos principales siguen esta eleccion. Los textos del motor de coincidencias pueden seguir en ingles por ahora.",
    optionEn: "Ingles",
    optionEs: "Espanol",
    optionHe: "Hebreo",
  },
  appShell: {
    apiUnreachableTitle: "No se puede conectar con dating-api",
    retryConnection: "Reintentar conexion",
    redirecting: "Redirigiendo…",
  },
  matches: {
    list: {
      backToAnalysis: "← Tu analisis",
      editProfile: "Editar perfil",
      title: "Tus coincidencias",
      subtitle:
        "Personas cuyo perfil y preferencias son compatibles con las tuyas.",
      analyzedPrefix: "Analizado",
      updatedPrefix: "Actualizado",
      staleRegionAria: "Analisis de perfil desactualizado",
      staleMessage:
        "Tu perfil cambio desde el ultimo analisis. Las puntuaciones pueden estar desactualizadas.",
      refreshAnalysis: "Actualizar analisis",
      refreshStarted:
        "Actualizacion iniciada — las puntuaciones se actualizaran al completar el analisis.",
      refreshFailed: "Error al actualizar",
      loadFailed: "No se pudieron cargar las coincidencias",
      photoGate: {
        title: "Agrega una foto para ver coincidencias",
        body: "Necesitas al menos una foto aprobada antes de poder ver personas aqui.",
        bodyPending:
          "Tu foto sigue en revision. Cuando se apruebe, las coincidencias apareceran aqui.",
        cta: "Ir a fotos",
      },
      actionBadge: {
        liked: { label: "Me gusta", ariaLabel: "Te gusto esta coincidencia" },
        passed: { label: "Paso", ariaLabel: "Pasaste esta coincidencia" },
        blocked: { label: "Bloqueado", ariaLabel: "Bloqueaste esta coincidencia" },
      },
      hardBlocked: {
        badge: "Ya no es coincidencia",
        badgeAria: "Esta coincidencia ya no es elegible",
        youLikedThisProfile: "Te gusto este perfil",
        moreReasonsCount: (count) => `+ ${count} diferencia${count === 1 ? '' : 's'} más`,
        smokingExcludedViewerToThem:
          "Esta persona fuma, y tus preferencias excluyen fumadores.",
        smokingExcludedThemToViewer:
          "Tu fumas, y sus preferencias excluyen fumadores.",
        smokingRequiredViewerToThem:
          "Esta persona no fuma, y tu solo quieres fumadores.",
        smokingRequiredThemToViewer:
          "Tu no fumas, y ellos solo quieren fumadores.",
        ageViewerToThem: "Su edad esta fuera de tu rango preferido.",
        ageThemToViewer: "Tu edad esta fuera de su rango preferido.",
        genderViewerToThem:
          "Su genero no esta en tus preferencias de pareja.",
        genderThemToViewer:
          "Tu genero no esta en sus preferencias de pareja.",
        proximityViewerToThem: "Estan fuera de tu distancia preferida.",
        proximityThemToViewer: "Estas fuera de su distancia preferida.",
        genericViewerToThem:
          "Algo en su perfil entra en conflicto con tus preferencias.",
        genericThemToViewer:
          "Algo en tu perfil entra en conflicto con sus preferencias.",
        evidenceBoth: (viewerQuote, counterpartyQuote) =>
          `“${viewerQuote}” · “${counterpartyQuote}”`,
        evidenceViewer: (viewerQuote) => `“${viewerQuote}”`,
        evidenceCounterparty: (counterpartyQuote) => `“${counterpartyQuote}”`,
      },
    },
    detail: {
      backToMatches: "← Volver a coincidencias",
      matchLabel: "Coincidencia",
      whyYouMatch: "Por que coinciden",
      traitStrong: "Fuerte",
      traitModerate: "Moderado",
      aboutThem: "Sobre esta persona",
      noSummary: "Aun no hay resumen de analisis.",
      analyzedPrefix: "Analizado",
      updatedPrefix: "Actualizado",
      youMatched: "¡Hay coincidencia!",
      viewConversation: "Ver conversacion",
      actionStatus: {
        liked: "Te gusto esta persona",
        passed: "Pasaste esta persona",
        blocked: "Bloqueaste a esta persona",
      },
      undoLikeAria: "Deshacer me gusta en esta coincidencia",
      undoPassAria: "Deshacer paso en esta coincidencia",
      saving: "Guardando…",
      undo: "Deshacer",
      like: "Me gusta",
      pass: "Paso",
      block: "Bloquear",
      blockConfirm: "¿Estas seguro? Esto no se puede deshacer.",
      blockPermanently: "Bloquear permanentemente",
      backToMatchesButton: "Volver a coincidencias",
      loadFailed: "No se pudo cargar la coincidencia",
      likeFailed: "No se pudo registrar me gusta",
      passFailed: "No se pudo registrar paso",
      undoFailed: "No se pudo deshacer la accion",
      feedbackFailed: "No se pudo enviar la opinion",
      blockFailed: "No se pudo bloquear",
      hardBlocked: {
        banner: "Ya no es coincidencia",
        reasonsHeading: "Por que",
        reviewPreferences: "Revisar preferencias",
        actionsDisabled:
          "Me gusta y Paso no estan disponibles mientras las preferencias bloquean esta coincidencia.",
        youLikedThisProfile: "Te gusto este perfil",
        smokingExcludedViewerToThem:
          "Esta persona fuma, y tus preferencias excluyen fumadores.",
        smokingExcludedThemToViewer:
          "Tu fumas, y sus preferencias excluyen fumadores.",
        smokingRequiredViewerToThem:
          "Esta persona no fuma, y tu solo quieres fumadores.",
        smokingRequiredThemToViewer:
          "Tu no fumas, y ellos solo quieren fumadores.",
        ageViewerToThem: "Su edad esta fuera de tu rango preferido.",
        ageThemToViewer: "Tu edad esta fuera de su rango preferido.",
        genderViewerToThem:
          "Su genero no esta en tus preferencias de pareja.",
        genderThemToViewer:
          "Tu genero no esta en sus preferencias de pareja.",
        proximityViewerToThem: "Estan fuera de tu distancia preferida.",
        proximityThemToViewer: "Estas fuera de su distancia preferida.",
        genericViewerToThem:
          "Algo en su perfil entra en conflicto con tus preferencias.",
        genericThemToViewer:
          "Algo en tu perfil entra en conflicto con sus preferencias.",
        evidenceBoth: (viewerQuote, counterpartyQuote) =>
          `“${viewerQuote}” · “${counterpartyQuote}”`,
        evidenceViewer: (viewerQuote) => `“${viewerQuote}”`,
        evidenceCounterparty: (counterpartyQuote) => `“${counterpartyQuote}”`,
      },
    },
    celebration: {
      title: "¡Hay coincidencia!",
      sendMessage: "Enviar mensaje",
      closeAria: "Cerrar",
    },
  },
  conversations: {
    format: {
      matchedTodayAt: (time) => `Coincidencia hoy a las ${time}`,
      matchedYesterday: "Coincidencia ayer",
      matchedDaysAgo: (days) => `Coincidencia hace ${days} dias`,
      matchedOn: (date) => `Coincidencia el ${date}`,
      justNow: "Ahora mismo",
      minutesAgo: (minutes) => `Hace ${minutes} min`,
      yesterdayAt: (time) => `Ayer ${time}`,
    },
    list: {
      backToMatches: "← Tus coincidencias",
      title: "Conversaciones",
      subtitle: "Tus coincidencias mutuas — abre una conversacion para escribir.",
      tryAgain: "Intentar de nuevo",
      emptyTitle: "Aun no hay coincidencias. ¡Sigue explorando!",
      emptyBody:
        "Cuando ambos se gusten, apareceran aqui.",
      browseMatches: "Ver coincidencias",
      unreadAria: (count) =>
        `${count} mensaje${count === 1 ? "" : "s"} sin leer`,
      loadFailed: "No se pudieron cargar las conversaciones",
      youPrefix: "Tú: ",
      noMessagesYet: "Aún no hay mensajes",
    },
    detail: {
      backToList: "← Volver a conversaciones",
      messagingAria: "Mensajes",
      reconnecting: "Reconectando…",
      loadingMessages: "Cargando mensajes…",
      loadEarlier: "Cargar mensajes anteriores",
      emptyMessages: "Aun no hay mensajes. ¡Saluda!",
      messageLabel: "Mensaje",
      messagePlaceholder: "Escribe un mensaje…",
      send: "Enviar",
      sending: "Enviando…",
      unmatch: "Quitar coincidencia",
      unmatchConfirm: (name) =>
        `¿Quitar coincidencia con ${name}? Ya no veras sus mensajes. No se puede deshacer.`,
      loadFailed: "No se pudo cargar la conversacion",
      unmatchFailed: "No se pudo quitar la coincidencia",
      loadMessagesFailed: "No se pudieron cargar los mensajes",
      loadEarlierFailed: "No se pudieron cargar mensajes anteriores",
      sendFailed: "No se pudo enviar el mensaje",
    },
  },
  navAuth: {
    apiUnreachable: "No se puede contactar la API",
    dismiss: "Cerrar",
    signIn: "Iniciar sesión",
    accountMenuAria: "Menú de cuenta",
    accountMenuLabel: "Cuenta",
  },
  datingHub: {
    title: "Encuentra tu pareja",
    subtitle:
      "Cuéntanos sobre ti y a quién buscas; te ayudaremos a llegar allí.",
    getStarted: "Empezar",
    viewMatches: "Ver coincidencias",
  },
  analysisPage: {
    loading: "Cargando análisis…",
    loadFailed: "No pudimos cargar tu análisis.",
    loadFailedHint: "Inténtalo de nuevo.",
    reRunAnalysis: "Volver a analizar",
    analysisRunning: "Análisis en curso…",
    lastRunPrefix: "Última ejecución",
    sectionHowWeRead: "Cómo leemos tu perfil",
    sectionWhatYouWrote: "Lo que escribiste",
    insightAboutYou: "Sobre ti",
    insightHowYouRelate: "Cómo te relacionas",
    insightWhoYouWant: "A quién buscas",
    referenceAboutMe: "Sobre mí",
    referenceRelationshipStyle: "Estilo de relación",
    referencePartnerPreference: "Preferencia de pareja",
    referenceEmpty: "Aún no hay nada guardado aquí.",
    showMore: "Ver más",
    showLess: "Ver menos",
  },
  nav: {
    brand: "Citas",
    home: "Inicio",
    matches: "Coincidencias",
    conversations: "Conversaciones",
    profile: "Perfil",
    analysis: "Analisis",
    accountSettings: "Configuracion de cuenta",
    editBasicProfile: "Editar perfil basico",
    editStoryProfile: "Editar perfil de historia",
    language: "Idioma",
    logout: "Cerrar sesion",
    mainAria: "Principal",
    primaryAria: "Primario",
    conversationsUnreadLabel: (count: number) =>
      `${count} mensaje${count === 1 ? "" : "s"} sin leer`,
    matchesNewLabel: (count: number) =>
      `${count} coincidencia${count === 1 ? "" : "s"} nueva${count === 1 ? "" : "s"}`,
  },
  gender: {
    MALE: "Hombre",
    FEMALE: "Mujer",
    NON_BINARY: "No binario",
    OTHER: "Otro",
    PREFER_NOT_TO_SAY: "Prefiero no decirlo",
  },
  onboarding: {
    basicsTitle: "Paso 1 — Basico",
    basicsSubtitle:
      "Guarda en cualquier momento; tus respuestas se recargan desde el servidor al volver.",
    storyTitle: "Paso 2 — Tu historia",
    storySubtitle:
      "Guarda un borrador o finaliza para enviar tu perfil a analisis.",
    syncingProfile: "Sincronizando perfil…",
    loadFailed: "No se pudo cargar el perfil",
    saveFailed: "Error al guardar",
    savedFlash: "Guardado.",
    saveProgress: "Guardar progreso",
    continueLater: "Continuar mas tarde",
    header: {
      exit: "Salir",
      skip: "Omitir por ahora",
      aria: "Progreso del registro",
    },
    stepBasic: "Basico",
    stepTexts: "Historia",
    exitDialog: {
      title: "Salir del registro?",
      body: "El progreso guardado se conserva. Los cambios sin guardar pueden perderse.",
      cancel: "Cancelar",
      confirm: "Salir",
    },
    basicForm: {
      sectionTitle: "Basico",
      googleNameLabel: "Nombre de Google",
      googleNameHelp:
        "De tu cuenta de Google (solo lectura). Usa el apodo abajo para como apareces aqui.",
      nicknameLabel: "Apodo",
      nicknamePlaceholder: "Como quieres que te llamen",
      birthDateLabel: "Fecha de nacimiento",
      ageDisplay: (age: number) => `Edad: ${age}`,
      genderLabel: "Genero",
      genderSelectPlaceholder: "— Seleccionar —",
      partnerGendersLegend: "Abierto/a a emparejar con",
      partnerGendersRequiredHint: "(obligatorio para continuar)",
      partnerGendersRequiredError:
        "Elige al menos un genero con el que estes abierto/a a emparejar antes de continuar.",
      genderRequiredError: (preferNotToSay: string) =>
        `Elige un genero (distinto de "${preferNotToSay}") antes de continuar — es obligatorio para el analisis.`,
      cityLabel: "Ciudad",
      cityPlaceholder: "p. ej. Tel Aviv",
      countryLabel: "Pais",
      countryPlaceholder: "p. ej. IL",
      locationLabelLabel: "Etiqueta de ubicacion",
      locationLabelPlaceholder: "p. ej. Tel Aviv, Israel",
      continueToStory: "Continuar a la historia",
    },
    textsForm: {
      intro:
        "Unos parrafos cortos nos ayudan a entenderte. Puedes guardar y volver, o finalizar para ejecutar el analisis.",
      aboutMeLabel: "Sobre mi",
      aboutMePlaceholder: "Describe quien eres…",
      aboutPartnerLabel: "Sobre la pareja",
      aboutPartnerPlaceholder: "Que buscas en una pareja…",
      aboutRelationshipLabel: "Sobre la relacion",
      aboutRelationshipPlaceholder: "Que quieres de una relacion…",
      finishAndAnalyze: "Finalizar y analizar",
      submitting: "Enviando…",
      backToBasics: "Volver a lo basico",
      genderMissingError:
        "Vuelve a lo basico y elige un genero antes de enviar a analisis.",
      verifyFailedError: "No se pudo verificar tu perfil. Intentalo de nuevo.",
      finishFailedError: "No se pudo finalizar el registro",
    },
  },
  notifications: {
    messageToast: (name: string) => `${name} te envio un mensaje`,
    messageToastAction: "Ver",
    messageToastDismiss: "Cerrar",
  },
  profile: {
    notifications: {
      notificationsTitle: "Notificaciones",
      inAppLabel: "Mostrar alertas en la app",
      inAppHelp:
        "Aviso cuando recibes un mensaje con la app abierta.",
      emailLabel: "Enviarme correo cuando no estoy en linea",
      emailHelp:
        "Correo cuando no estas en linea. El enlace de baja en los correos sigue funcionando.",
      saveError:
        "No se pudieron guardar las preferencias. Intentalo de nuevo.",
    },
    matchPreferencesLink: "Preferencias de coincidencias",
    matchPreferencesLinkHelp:
      "A quien estas abierto, rango de edad y distancia maxima.",
    viewPage: {
      titleProfile: "Perfil",
      titleReview: "Tu perfil",
      subtitle: "Revisa tus respuestas antes de buscar coincidencias.",
      matchingSectionTitle: "Emparejamiento",
      matchPreferencesLinkCta: (label: string) => `${label} →`,
      analysisLinkCta: (label: string) => `${label} →`,
      backToOnboarding: "Volver al registro",
      noProfileBody:
        "Aun no tienes perfil. Completa el registro para revisarlo y encontrar coincidencias.",
      editLink: "Editar",
      findMatchesLink: "Buscar coincidencias",
      emptyValue: "—",
    },
  },
  matchPreferences: {
    title: "Preferencias de coincidencias",
    subtitle:
      "Con quien estas abierto a hacer match. Los cambios aplican en tu proxima visita a coincidencias.",
    saveSuccess: "Preferencias guardadas.",
    saveHint: "Tu lista de coincidencias se actualizara en la proxima visita.",
    saveError:
      "No se pudieron guardar las preferencias de coincidencias. Intentalo de nuevo.",
    ageRangeInvalid:
      "La edad minima debe ser menor o igual que la edad maxima.",
    partnerGendersRequired:
      "Selecciona al menos un genero con el que estas abierto a hacer match.",
    noProfile: "Aun no tienes perfil. Completa el onboarding primero.",
    goToOnboarding: "Ir al onboarding",
    sections: {
      partnerGenders: "Abierto a hacer match con",
      age: "Rango de edad de pareja",
      distance: "Distancia maxima",
    },
    fields: {
      partnerGendersHelp: "Obligatorio — quien puede aparecer en tu lista.",
      ageMin: "Edad minima",
      ageMax: "Edad maxima",
      maxDistanceKm: "Distancia max. (km)",
    },
    partnerGender: {
      MALE: "Hombre",
      FEMALE: "Mujer",
      NON_BINARY: "No binario",
      OTHER: "Otro",
      PREFER_NOT_TO_SAY: "Prefiero no decirlo",
    },
    inferredDealbreakers: {
      title: "Lo que leemos como trato de ruptura",
      disclaimer:
        "Inferido del texto de tu historia — no es un ajuste que hayas configurado. Edita tu historia para cambiar lo que leemos.",
      empty:
        "Aun no hemos inferido tratos de ruptura ni requisitos duros a partir de tu texto.",
      dealbreakerLine: (quote) =>
        `Lo leimos como un trato de ruptura: “${quote}”`,
      requirementLine: (quote) =>
        `Lo leimos como un requisito: “${quote}”`,
      editStoryCta: "Editar tu historia",
    },
  },
  reportUser: {
    linkLabel: "Reportar",
    title: "Reportar usuario",
    reasonLabel: "Motivo",
    detailsLabel: "Detalles adicionales (opcional)",
    detailsPlaceholder: "Que ocurrio?",
    detailsHelp: "No incluyas contrasenas ni datos de pago.",
    confirm: (name, reason) => `Reportar a ${name} por ${reason}?`,
    submit: "Enviar reporte",
    continue: "Continuar",
    cancel: "Cancelar",
    close: "Cerrar",
    success: "Reporte enviado. Nuestro equipo lo revisara.",
    saveError: "No se pudo enviar el reporte. Intenta de nuevo.",
    duplicateError:
      "Ya enviaste este reporte recientemente. Intenta mas tarde o elige otro motivo.",
    reasons: {
      HARASSMENT: "Acoso o amenazas",
      SPAM: "Spam o estafa",
      FAKE_PROFILE: "Perfil falso o enganoso",
      INAPPROPRIATE_CONTENT: "Fotos o mensajes inapropiados",
      OTHER: "Otra cosa",
    },
  },
  accountSettings: {
    title: "Configuracion de cuenta",
    subtitle: "Informacion legal, notificaciones y eliminacion de cuenta.",
    legalSectionTitle: "Legal",
    privacyLink: "Politica de privacidad",
    termsLink: "Terminos de uso",
    notificationsSectionTitle: "Notificaciones",
    notificationsLink: "Preferencias de notificaciones →",
  },
  deleteAccount: {
    title: "Eliminar cuenta",
    description:
      "Elimina permanentemente tu perfil, fotos y mensajes del producto. No se puede deshacer.",
    confirmationLabel: "Escribe DELETE para confirmar",
    confirmationPlaceholder: "DELETE",
    submit: "Eliminar mi cuenta",
    submitting: "Eliminando…",
    saveError: "No se pudo eliminar la cuenta. Intenta de nuevo.",
    confirmationInvalid: "La confirmacion debe ser exactamente DELETE.",
  },
  photoGate: {
    bannerMessage: "Agrega una foto para ver coincidencias",
    bannerLink: "Ir a fotos",
    requiredForMatchingHint:
      "Se requiere al menos una foto antes de poder ver coincidencias.",
  },
  profilePhotos: {
    title: "Fotos",
    upload: "Subir",
    hint: "Hasta 3 fotos. Una foto principal.",
    loading: "Cargando fotos…",
    limitReached: "Límite de fotos alcanzado.",
    empty: "Vacío",
    uploading: "subiendo",
    uploadingPreviewAlt: "Vista previa al subir",
    noPreview: "Sin vista previa",
    primary: "principal",
    delete: "eliminar",
    setPrimary: "hacer principal",
    photoAlt: (position: number) => `Foto ${position}`,
    loadFailed: "No se pudieron cargar las fotos",
    uploadFailed: "Error al subir",
    deleteFailed: "Error al eliminar",
    setPrimaryFailed: "No se pudo establecer como principal",
  },
  photoModeration: {
    statusPending: "En revision",
    statusApproved: "Aprobada",
    statusRejected: "Rechazada",
    statusFlagged: "Requiere revision",
    rejectionPrefix: "Motivo:",
    rejectionReasons: {
      no_face:
        "No pudimos detectar un rostro claro en tu foto. Sube una foto donde se vea tu cara.",
      explicit_content: "Tu foto no cumple nuestras normas de la comunidad.",
      low_quality:
        "La calidad de tu foto es demasiado baja. Sube una imagen de mayor resolucion.",
      not_real_person:
        "Sube una foto tuya (no una celebridad, meme o imagen de stock).",
      other: "Tu foto no fue aprobada. Prueba con otra foto.",
    },
  },
  profileCompleteness: {
    title: "Lista de perfil",
    photo: "Foto subida",
    basics: "Datos basicos completos",
    story: "Secciones de historia completas",
    complete: "Completo",
    incomplete: "Incompleto",
  },
  analysisProgress: {
    title: "Analisis en curso",
    submittedStep: "Enviado — en cola",
    analyzingStep: "Analizando tu perfil…",
    waitHint: "Suele tardar unos minutos.",
    editProfileLink: "Editar perfil",
    addPhotoLink: "Agregar o cambiar foto",
    failedTitle:
      "El analisis fallo. Puedes intentar de nuevo o actualizar tu perfil.",
    retryButton: "Intentar de nuevo",
    redirecting: "Redirigiendo a coincidencias…",
  },
  launch: {
    emptyMatches: {
      title: "No hay coincidencias por ahora",
      bodyWithPlace: (place: string) =>
        `Mas personas se estan uniendo en ${place}. Vuelve pronto.`,
      bodyGeneric: "Mas personas se estan uniendo — vuelve pronto.",
      filterHint: "Tus preferencias pueden reducir la lista.",
      editPreferences: "Editar preferencias",
      editProfile: "Editar perfil",
      inviteCopyLink: "Copiar enlace de invitacion",
      inviteCopied: "Enlace copiado",
    },
    matchDetail: {
      matchScoreLabel: (score: number) => `Puntuacion · ${score}`,
      feedback: {
        prompt: 'Te resulto util esta sugerencia?',
        thanks: 'Gracias por tu opinion.',
        positiveLabel: 'Sugerencia util',
        negativeLabel: 'Sugerencia poco util',
      },
    },
  },
  error: {
    dating: {
      title: "Algo salio mal",
      message: "No pudimos cargar esta pagina. Intenta de nuevo.",
    },
    authenticated: {
      title: "Algo salio mal",
      message: "No pudimos cargar esta pagina. Intenta de nuevo.",
    },
    retry: "Intentar de nuevo",
  },
};
