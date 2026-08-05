export type SupportIssueType =
  | 'matches'
  | 'photo'
  | 'conversation'
  | 'bug'
  | 'feature'
  | 'other';

export function getSupportOpsEmail(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return raw && raw.includes('@') ? raw : null;
}

export function buildSupportMailto(args: {
  to: string;
  issueTypeLabel: string;
  description: string;
  replyEmail: string;
}): string {
  const subject = `Piza support: ${args.issueTypeLabel}`;
  const body = [
    `Issue type: ${args.issueTypeLabel}`,
    `Reply-to: ${args.replyEmail.trim() || '(not provided)'}`,
    '',
    args.description.trim() || '(no description)',
  ].join('\n');
  // Do not encode the address — many clients break on mailto:user%40host.
  return `mailto:${args.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
