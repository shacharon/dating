import { IsBoolean, IsOptional } from 'class-validator';

/** PATCH /api/v1/me/notification-preferences — partial update (at least one key required). */
export class PatchNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppNotificationsEnabled?: boolean;
}
