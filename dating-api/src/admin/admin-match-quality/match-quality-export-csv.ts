import type { MatchQualityExportDto } from './dto/match-quality-export.dto';

function formatPositiveRate(value: number | null): string {
  if (value === null) {
    return '';
  }
  return String(value);
}

export function serializeMatchQualityExportCsv(
  exportDto: MatchQualityExportDto,
): string {
  const { summary } = exportDto;
  const commentLines = [
    `# feedbackCount,${summary.feedbackCount}`,
    `# positiveCount,${summary.positiveCount}`,
    `# negativeCount,${summary.negativeCount}`,
    `# positiveRate,${formatPositiveRate(summary.positiveRate)}`,
    `# distinctReporters,${summary.distinctReporters}`,
    `# distinctCandidates,${summary.distinctCandidates}`,
  ];

  const header =
    'matchProfileId,negativeCount,distinctViewers,lastNegativeAt';
  const dataLines = exportDto.negativeCandidates.map(
    (row) =>
      `${row.matchProfileId},${row.negativeCount},${row.distinctViewers},${row.lastNegativeAt}`,
  );

  return [...commentLines, '', header, ...dataLines].join('\n');
}
