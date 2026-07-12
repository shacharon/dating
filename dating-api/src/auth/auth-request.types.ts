import type { Request } from 'express';
import type { ValidatedSession } from '../session/session.types';
import type { AuthMeResponseDto } from './auth.dto';

/**
 * Populated by {@link AuthGuard} / {@link OptionalAuthGuard} after session validation.
 * Never set `authUser` from client input — only from DB after {@link SessionService.validateSessionToken}.
 */
export type RequestAuthState = {
  authUser?: AuthMeResponseDto;
  authSession?: ValidatedSession;
};

export type AuthenticatedRequest = Request & RequestAuthState;
