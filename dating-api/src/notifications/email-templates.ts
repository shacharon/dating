import { escapeHtml } from './email-format.util';

export type EmailTemplate = {
  subject: string;
  textBody: string;
  htmlBody: string;
};

export function buildNewMessageEmail(params: {
  senderLabel: string;
  url: string;
}): EmailTemplate {
  return {
    subject: 'New message on Piza',
    textBody: `${params.senderLabel} sent you a message. Read it here: ${params.url}`,
    htmlBody: `<p><strong>${escapeHtml(params.senderLabel)}</strong> sent you a message.</p><p><a href="${params.url}">Read it here</a></p>`,
  };
}

export function buildMutualMatchEmail(params: {
  otherLabel: string;
  url: string;
}): EmailTemplate {
  return {
    subject: "It's a match on Piza!",
    textBody: `You matched with ${params.otherLabel}. Start the conversation: ${params.url}`,
    htmlBody: `<p>You matched with <strong>${escapeHtml(params.otherLabel)}</strong>!</p><p><a href="${params.url}">Start the conversation</a></p>`,
  };
}

export function buildPhotoRejectionEmail(params: {
  reason: string;
  url: string;
}): EmailTemplate {
  return {
    subject: 'Your photo was not approved',
    textBody: `${params.reason}\n\nYou can upload a new photo here: ${params.url}`,
    htmlBody: `<p>${escapeHtml(params.reason)}</p><p><a href="${escapeHtml(params.url)}">Upload a new photo</a></p>`,
  };
}

/** Same fields/lines as ReportOps body (incl. optional details). */
export function buildReportOpsEmail(report: {
  id: string;
  reason: string;
  reporterUserId: string;
  reportedUserId: string;
  contextType: string;
  contextId: string;
  createdAt: Date;
  details: string | null;
}): EmailTemplate {
  const lines = [
    `Report id: ${report.id}`,
    `Reason: ${report.reason}`,
    `Reporter user id: ${report.reporterUserId}`,
    `Reported user id: ${report.reportedUserId}`,
    `Context: ${report.contextType} / ${report.contextId}`,
    `Created at: ${report.createdAt.toISOString()}`,
  ];
  if (report.details) {
    lines.push('', 'Details:', report.details);
  }
  const text = lines.join('\n');

  return {
    subject: `[dating] User report — ${report.reason}`,
    textBody: text,
    htmlBody: `<pre>${escapeHtml(text)}</pre>`,
  };
}
