import { BadRequestException, Controller, Get, Header, Query } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailUnsubscribeTokenService } from './email-unsubscribe-token.service';

@Controller('api/v1/notifications/email')
export class EmailUnsubscribeController {
  constructor(
    private readonly tokens: EmailUnsubscribeTokenService,
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  @Get('unsubscribe')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async unsubscribe(@Query('token') token?: string): Promise<string> {
    const verified = token ? this.tokens.verify(token) : null;
    if (!verified) {
      this.obs.trace(
        'email unsubscribe invalid token',
        ErrorCodes.EMAIL_UNSUBSCRIBE_INVALID,
      );
      throw new BadRequestException('Invalid or expired unsubscribe link.');
    }

    await this.prisma.user.update({
      where: { id: verified.userId },
      data: { emailNotificationsEnabled: false },
    });

    this.obs.trace(
      `email unsubscribe ok userId=${verified.userId}`,
      ErrorCodes.EMAIL_UNSUBSCRIBE_OK,
    );

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title></head><body><p>You have been unsubscribed from Piza email notifications.</p></body></html>`;
  }
}
