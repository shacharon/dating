import { MeProfileWritableFieldsDto } from './me-profile-writable-fields.dto';

/**
 * POST /api/v1/me/profile — optional draft fields only.
 * `userId` / `status` / `id` are not accepted (use ValidationPipe forbidNonWhitelisted).
 */
export class CreateMeProfileDto extends MeProfileWritableFieldsDto {}
