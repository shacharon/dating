import { ErrorCodes } from '../logging/error-codes';
import { MeDomainError } from './me-domain.error';

/** Base for me-conversations orchestration errors. */
export abstract class MeConversationsDomainError extends MeDomainError {
  constructor(message?: string) {
    super(message ?? 'MeConversationsDomainError');
  }
}

export class ConversationListInvalidCursorError extends MeConversationsDomainError {
  readonly httpStatus = 400;
  readonly errorCode = ErrorCodes.ME_CONVERSATIONS_INVALID_CURSOR;
  readonly httpBody = {
    error: 'invalid_cursor',
    message: 'Invalid conversation list cursor.',
  } as const;

  constructor() {
    super('Invalid conversation list cursor.');
  }
}

export class ConversationNotFoundError extends MeConversationsDomainError {
  readonly httpStatus = 404;
  readonly errorCode = ErrorCodes.ME_CONVERSATIONS_NOT_FOUND;
  readonly httpBody = {
    error: 'conversation_not_found',
    message: 'Conversation not found.',
  } as const;

  constructor() {
    super('Conversation not found.');
  }
}

export class ConversationForbiddenError extends MeConversationsDomainError {
  readonly httpStatus = 403;
  readonly errorCode = ErrorCodes.ME_CONVERSATIONS_FORBIDDEN;
  readonly httpBody = {
    error: 'conversation_forbidden',
    message: 'You do not have access to this conversation.',
  } as const;

  constructor() {
    super('You do not have access to this conversation.');
  }
}
