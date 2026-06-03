import { Injectable } from '@nestjs/common';
import type {
  EmailProvider,
  EmailSendParams,
  EmailSendResult,
} from './email-provider.interface';

@Injectable()
export class NoopEmailProvider implements EmailProvider {
  async send(_params: EmailSendParams): Promise<EmailSendResult> {
    return { id: null };
  }
}
