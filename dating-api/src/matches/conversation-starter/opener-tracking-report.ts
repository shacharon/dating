export type OpenerWeeklyReport = {
  windowDays: 7;
  generated: number;
  displayed: number;
  used: number;
  sent: number;
  edited: number;
  replied: number;
  usageRate: number | null;
  editRate: number | null;
  sendRate: number | null;
  responseRate: number | null;
  avgResponseTimeMin: number | null;
};

export type OpenerReportRow = {
  displayed: boolean;
  used: boolean;
  sent: boolean;
  edited: boolean;
  receivedReply: boolean;
  responseTimeMin: number | null;
};

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function buildOpenerWeeklyReport(
  rows: ReadonlyArray<OpenerReportRow>,
): OpenerWeeklyReport {
  const generated = rows.length;
  const displayed = rows.filter((r) => r.displayed).length;
  const used = rows.filter((r) => r.used).length;
  const sent = rows.filter((r) => r.sent).length;
  const edited = rows.filter((r) => r.sent && r.edited).length;
  const replied = rows.filter((r) => r.receivedReply).length;
  const responseTimes = rows
    .filter((r) => r.receivedReply && r.responseTimeMin != null)
    .map((r) => r.responseTimeMin as number);
  const avgResponseTimeMin =
    responseTimes.length === 0
      ? null
      : responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

  return {
    windowDays: 7,
    generated,
    displayed,
    used,
    sent,
    edited,
    replied,
    usageRate: rate(used, displayed),
    editRate: rate(edited, sent),
    sendRate: rate(sent, used),
    responseRate: rate(replied, sent),
    avgResponseTimeMin,
  };
}
