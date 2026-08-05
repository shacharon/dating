import { buildOpenerWeeklyReport } from '../../matches/conversation-starter/opener-tracking-report';
import { ErrorCodes } from '../../logging/error-codes';
import { AdminBetaMetricsService } from './admin-beta-metrics.service';

describe('AdminBetaMetricsService', () => {
  const asOf = new Date('2026-08-05T12:00:00.000Z');

  function makePrisma(counts: {
    active: number;
    signups: number;
    cohort: number;
    returned: number;
    high: number;
    good: number;
    other: number;
    emails: number;
    openerRows: Array<{
      displayed: boolean;
      used: boolean;
      sent: boolean;
      edited: boolean;
      receivedReply: boolean;
      responseTimeMin: number | null;
    }>;
  }) {
    return {
      user: {
        count: jest
          .fn()
          .mockResolvedValueOnce(counts.active)
          .mockResolvedValueOnce(counts.signups)
          .mockResolvedValueOnce(counts.cohort)
          .mockResolvedValueOnce(counts.returned),
      },
      conversationStarterCache: {
        findMany: jest.fn().mockResolvedValue(counts.openerRows),
      },
      matchListRank: {
        count: jest
          .fn()
          .mockResolvedValueOnce(counts.high)
          .mockResolvedValueOnce(counts.good)
          .mockResolvedValueOnce(counts.other),
      },
      highPriorityMatchEmailLog: {
        count: jest.fn().mockResolvedValue(counts.emails),
      },
    };
  }

  it('assembles Postgres KPIs and opener report', async () => {
    const openerRows = [
      {
        displayed: true,
        used: true,
        sent: true,
        edited: false,
        receivedReply: true,
        responseTimeMin: 10,
      },
      {
        displayed: true,
        used: false,
        sent: false,
        edited: false,
        receivedReply: false,
        responseTimeMin: null,
      },
    ];
    const prisma = makePrisma({
      active: 12,
      signups: 40,
      cohort: 25,
      returned: 10,
      high: 20,
      good: 30,
      other: 50,
      emails: 3,
      openerRows,
    });
    const obs = { trace: jest.fn(), error: jest.fn() };
    const service = new AdminBetaMetricsService(prisma as never, obs as never);

    const dto = await service.getMetrics('admin_1', '2026-08-01', asOf);

    expect(dto.activeUsers7d).toBe(12);
    expect(dto.signupsSinceBetaStart).toBe(40);
    expect(dto.d7.cohortSize).toBe(25);
    expect(dto.d7.returnedCount).toBe(10);
    expect(dto.d7.rate).toBeCloseTo(0.4);
    expect(dto.d7.advisory).toBe(false);
    expect(dto.opener.usageRate).toBe(
      buildOpenerWeeklyReport(openerRows).usageRate,
    );
    expect(dto.priorityShare.highShare).toBeCloseTo(0.2);
    expect(dto.highPriorityEmails7d).toBe(3);
    expect(dto.betaStart.startsWith('2026-08-01')).toBe(true);
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('admin_1'),
      ErrorCodes.ADMIN_BETA_METRICS_FETCHED,
    );
  });
});
