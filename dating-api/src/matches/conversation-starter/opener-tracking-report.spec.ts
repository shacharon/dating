import {
  buildOpenerWeeklyReport,
  type OpenerReportRow,
} from './opener-tracking-report';
import {
  normalizeOpenerCompareText,
  wasOpenerEdited,
} from './opener-tracking-normalize';

describe('opener-tracking-normalize', () => {
  it('collapses whitespace for compare', () => {
    expect(normalizeOpenerCompareText('  a   b  ')).toBe('a b');
  });

  it('detects edits', () => {
    expect(wasOpenerEdited('Hello trail?', 'Hello trail?')).toBe(false);
    expect(wasOpenerEdited('Hello trail?', 'Hello trail!')).toBe(true);
    expect(wasOpenerEdited('  Hello   trail?  ', 'Hello trail?')).toBe(false);
  });
});

describe('buildOpenerWeeklyReport', () => {
  it('computes rates and averages', () => {
    const rows: OpenerReportRow[] = [
      {
        displayed: true,
        used: true,
        sent: true,
        edited: true,
        receivedReply: true,
        responseTimeMin: 30,
      },
      {
        displayed: true,
        used: true,
        sent: true,
        edited: false,
        receivedReply: false,
        responseTimeMin: null,
      },
      {
        displayed: true,
        used: false,
        sent: false,
        edited: false,
        receivedReply: false,
        responseTimeMin: null,
      },
      {
        displayed: false,
        used: false,
        sent: false,
        edited: false,
        receivedReply: false,
        responseTimeMin: null,
      },
    ];
    const report = buildOpenerWeeklyReport(rows);
    expect(report.generated).toBe(4);
    expect(report.displayed).toBe(3);
    expect(report.used).toBe(2);
    expect(report.sent).toBe(2);
    expect(report.edited).toBe(1);
    expect(report.replied).toBe(1);
    expect(report.usageRate).toBeCloseTo(2 / 3);
    expect(report.editRate).toBeCloseTo(0.5);
    expect(report.sendRate).toBeCloseTo(1);
    expect(report.responseRate).toBeCloseTo(0.5);
    expect(report.avgResponseTimeMin).toBe(30);
  });

  it('returns null rates when denominators are zero', () => {
    const report = buildOpenerWeeklyReport([]);
    expect(report.usageRate).toBeNull();
    expect(report.editRate).toBeNull();
    expect(report.sendRate).toBeNull();
    expect(report.responseRate).toBeNull();
    expect(report.avgResponseTimeMin).toBeNull();
  });
});
