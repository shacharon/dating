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
  },
};
