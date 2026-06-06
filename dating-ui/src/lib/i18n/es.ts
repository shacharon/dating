import type { AppCopySchema } from "@/lib/i18n/types";

export const esCopy: AppCopySchema = {
  common: {
    loading: "Cargando…",
    save: "Guardar",
    cancel: "Cancelar",
  },
  nav: {
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
    conversationsUnreadLabel: (count: number) =>
      `${count} mensaje${count === 1 ? "" : "s"} sin leer`,
  },
  onboarding: {
    basicsTitle: "Paso 1 — Basico",
    basicsSubtitle:
      "Guarda en cualquier momento; tus respuestas se recargan desde el servidor al volver.",
    storyTitle: "Paso 2 — Tu historia",
    storySubtitle:
      "Guarda un borrador o finaliza para enviar tu perfil a analisis.",
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
      "Rango de edad, genero de pareja, estilo de vida y otros filtros.",
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
      education: "Educacion minima",
      lifestyle: "Estilo de vida",
      family: "Familia",
      similarity: "Similitud vs diferencia",
    },
    fields: {
      partnerGendersHelp: "Obligatorio — quien puede aparecer en tu lista.",
      ageMin: "Edad minima",
      ageMax: "Edad maxima",
      maxDistanceKm: "Distancia max. (km)",
      minimumPartnerEducation: "Educacion minima",
      partnerWantsChildren: "Pareja quiere hijos",
      partnerHasChildren: "Pareja tiene hijos",
      similarityPreference: "Preferencia",
      multiSelectHelp:
        "Deja todo sin marcar si no tienes preferencia en esta dimension.",
      smokingGroup: "Tabaco",
      alcoholGroup: "Alcohol",
      religionGroup: "Religion",
      notSpecified: "Sin especificar",
    },
    partnerGender: {
      MALE: "Hombre",
      FEMALE: "Mujer",
      NON_BINARY: "No binario",
      OTHER: "Otro",
    },
    education: {
      ANY: "Cualquiera",
      HIGH_SCHOOL: "Secundaria",
      SOME_COLLEGE: "Universidad incompleta",
      BACHELORS: "Licenciatura",
      GRADUATE: "Posgrado",
    },
    smoking: {
      NONE_ONLY: "Solo no fumadores",
      SOCIAL_OK: "Fumar social OK",
      ANY: "Cualquiera",
    },
    alcohol: {
      NONE_ONLY: "Solo no bebedores",
      MODERATE_OK: "Beber moderado OK",
      ANY: "Cualquiera",
    },
    wantsChildren: {
      MUST_WANT: "Debe querer hijos",
      MUST_NOT_WANT: "No debe querer hijos",
      NO_REQUIREMENT: "Sin requisito",
    },
    hasChildren: {
      ACCEPT: "Acepta pareja con hijos",
      DOES_NOT_ACCEPT: "No acepta",
      NO_REQUIREMENT: "Sin requisito",
    },
    religion: {
      NONE: "Ninguna / secular",
      CHRISTIAN: "Cristiana",
      JEWISH: "Judia",
      MUSLIM: "Musulmana",
      HINDU: "Hindu",
      BUDDHIST: "Budista",
      SPIRITUAL_NON_AFFILIATED: "Espiritual (sin afiliacion)",
      OTHER: "Otra",
    },
    similarity: {
      similar: "Similar a mi",
      different: "Diferente de mi",
      balanced: "Equilibrado",
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
    },
  },
};
