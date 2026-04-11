import { MeProfileWritableFieldsDto } from './me-profile-writable-fields.dto';

/**
 * PATCH /api/v1/me/profile — partial draft updates only.
 * Phase 2: no `status` (remains DRAFT for create/update flows; transitions are not exposed).
 */
export class PatchMeProfileDto extends MeProfileWritableFieldsDto {}
