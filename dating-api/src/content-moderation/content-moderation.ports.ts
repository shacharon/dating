import type { ModerationResult } from './content-moderation.types';

export const CONTENT_MODERATION = Symbol('CONTENT_MODERATION');

export interface ContentModerationPort {
  checkContent(text: string): Promise<ModerationResult>;
}
