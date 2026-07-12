export type EmailSendParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSendResult = {
  id: string | null;
};

export interface EmailProvider {
  send(params: EmailSendParams): Promise<EmailSendResult>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
