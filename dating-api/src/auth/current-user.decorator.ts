import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './auth-request.types';
import type { AuthMeResponseDto } from './auth.dto';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthMeResponseDto => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.authUser;
    if (!user) {
      throw new InternalServerErrorException(
        'authUser missing; AuthGuard (or OptionalAuthGuard with a valid session) must run before CurrentUser().',
      );
    }
    return user;
  },
);
