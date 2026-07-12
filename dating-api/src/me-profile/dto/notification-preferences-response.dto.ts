/** PATCH /api/v1/me/notification-preferences success body. */
export interface NotificationPreferencesResponseDto {
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
}
