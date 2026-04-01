import { PrismaClient } from '@prisma/client';

type Mapping = {
  scalarColumn: 'relationship_clarity_self' | 'relationship_clarity_partner' | 'relationship_clarity_relationship';
  domain: 'self' | 'partner' | 'relationship';
  signal: 'relationshipClarity';
};

type Row = {
  extractionJson: unknown;
  relationship_clarity_self: number | null;
  relationship_clarity_partner: number | null;
  relationship_clarity_relationship: number | null;
};

const MAPPINGS: Mapping[] = [
  {
    scalarColumn: 'relationship_clarity_self',
    domain: 'self',
    signal: 'relationshipClarity',
  },
  {
    scalarColumn: 'relationship_clarity_partner',
    domain: 'partner',
    signal: 'relationshipClarity',
  },
  {
    scalarColumn: 'relationship_clarity_relationship',
    domain: 'relationship',
    signal: 'relationshipClarity',
  },
];

function getExtractionSignalValue(extractionJson: unknown, domain: Mapping['domain'], signal: string): number | null {
  const value = (extractionJson as any)?.base?.[domain]?.signals?.[signal];
  return typeof value === 'number' && !Number.isNaN(value) ? Math.round(value) : null;
}

function percent(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 10000) / 100;
}

function likelyFailureStage(
  extractionNonNull: number,
  dbNonNull: number,
  mismatchedRows: number,
  total: number,
): string {
  if (extractionNonNull === 0 && dbNonNull === 0) return 'LLM never emits';
  if (extractionNonNull > 0 && dbNonNull === 0) return 'canonical projection missing or persistence mismatch';
  if (dbNonNull > extractionNonNull) return 'persistence mismatch';
  if (mismatchedRows > 0) {
    const mismatchRate = mismatchedRows / total;
    if (mismatchRate > 0.5) return 'canonical projection missing or persistence mismatch';
    return 'persistence mismatch / bypass path';
  }
  return 'none';
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const rows = (await prisma.profileExtractionV2.findMany({
    select: {
      extractionJson: true,
      relationship_clarity_self: true,
      relationship_clarity_partner: true,
      relationship_clarity_relationship: true,
    },
  })) as Row[];

  const total = rows.length;
  const suspicious: Array<{
    signal: string;
    domain: string;
    extraction_non_null: number;
    db_non_null: number;
    delta: number;
    extraction_coverage_pct: number;
    db_coverage_pct: number;
    likely_failure_stage: string;
  }> = [];

  for (const mapping of MAPPINGS) {
    let extractionNonNull = 0;
    let dbNonNull = 0;
    let mismatchedRows = 0;

    for (const row of rows) {
      const extractionValue = getExtractionSignalValue(row.extractionJson, mapping.domain, mapping.signal);
      const dbValue = row[mapping.scalarColumn];

      if (extractionValue != null) extractionNonNull++;
      if (dbValue != null) dbNonNull++;

      const extractionNorm = extractionValue == null ? null : Math.round(extractionValue);
      const dbNorm = dbValue == null ? null : Math.round(dbValue);
      if (extractionNorm !== dbNorm) mismatchedRows++;
    }

    const delta = extractionNonNull - dbNonNull;
    const extractionCoverage = percent(extractionNonNull, total);
    const dbCoverage = percent(dbNonNull, total);
    const mismatchAbs = Math.abs(delta);
    const mismatchRatio = extractionNonNull > 0 ? mismatchAbs / extractionNonNull : 0;

    const isSuspicious =
      (dbNonNull === 0 && extractionNonNull > 0) ||
      (mismatchAbs > 0 && mismatchRatio >= 0.1);

    if (isSuspicious) {
      suspicious.push({
        signal: mapping.signal,
        domain: mapping.domain,
        extraction_non_null: extractionNonNull,
        db_non_null: dbNonNull,
        delta,
        extraction_coverage_pct: extractionCoverage,
        db_coverage_pct: dbCoverage,
        likely_failure_stage: likelyFailureStage(extractionNonNull, dbNonNull, mismatchedRows, total),
      });
    }
  }

  suspicious.sort((a, b) => {
    const aGap = Math.abs(a.delta);
    const bGap = Math.abs(b.delta);
    return bGap - aGap || a.domain.localeCompare(b.domain);
  });

  console.log('signal\tdomain\textraction_non_null\tdb_non_null\tdelta\tlikely_failure_stage');
  for (const s of suspicious) {
    console.log(
      `${s.signal}\t${s.domain}\t${s.extraction_non_null}\t${s.db_non_null}\t${s.delta}\t${s.likely_failure_stage}`,
    );
  }

  console.log('');
  console.log('top_5_most_urgent_gaps');
  const top5 = suspicious.slice(0, 5);
  if (top5.length === 0) {
    console.log('none');
  } else {
    for (const s of top5) {
      console.log(
        `${s.signal}.${s.domain} (delta=${s.delta}, extraction=${s.extraction_coverage_pct}%, db=${s.db_coverage_pct}%)`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

