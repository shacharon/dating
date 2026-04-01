import { PrismaClient } from '@prisma/client';
import { ExtractionV2Service, type ExtractionV2Result } from '../src/extraction/extraction-v2.service';
import { ExtractionV2PersistenceService } from '../src/extraction/extraction-v2-persistence.service';
import { EXTRACTION_SIGNAL_KEYS, type ExtractedSignals } from '../src/extraction/extracted-signals.interface';

type CaseDef = {
  caseId: string;
  kind: 'positive' | 'negative';
  text: string;
  llmSignals: Record<string, number | null>;
  evidence: Array<{ signal: string; quote: string; reason?: string }>;
};

type TraceValues = {
  raw_llm_output: number | null;
  normalizeRawExtraction: number | null;
  normalizeKeys: number | null;
  validateAndClean: number | null;
  validateExtraction: number | null;
  projectToCanonicalSignalScalars: number | null;
  persisted: number | null;
};

class CaptureLogger {
  public entries: string[] = [];
  log(...args: unknown[]): void {
    this.entries.push(args.map((a) => String(a)).join(' '));
  }
  debug(...args: unknown[]): void {
    this.entries.push(args.map((a) => String(a)).join(' '));
  }
  warn(...args: unknown[]): void {
    this.entries.push(args.map((a) => String(a)).join(' '));
  }
  error(...args: unknown[]): void {
    this.entries.push(args.map((a) => String(a)).join(' '));
  }
}

class MockLlmRouter {
  private payload: Record<string, unknown> = {};
  setPayload(value: Record<string, unknown>): void {
    this.payload = value;
  }
  async completeJSON<T>(): Promise<{ value: T; rawText: string; usage: unknown }> {
    return {
      value: this.payload as T,
      rawText: JSON.stringify(this.payload),
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    };
  }
}

function parseTrace(entries: string[]): TraceValues {
  const out: TraceValues = {
    raw_llm_output: null,
    normalizeRawExtraction: null,
    normalizeKeys: null,
    validateAndClean: null,
    validateExtraction: null,
    projectToCanonicalSignalScalars: null,
    persisted: null,
  };

  for (const line of entries) {
    const idx = line.indexOf('{');
    if (idx < 0) continue;
    const candidate = line.slice(idx).trim();
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      if (parsed.event !== 'self_relationship_clarity_trace') continue;
      const stage = String(parsed.stage ?? '');
      if (stage in out) {
        const v = parsed.value ?? parsed.canonical_relationship_clarity_self ?? parsed.relationship_clarity_self ?? null;
        out[stage as keyof TraceValues] = typeof v === 'number' ? Math.round(v) : null;
      }
    } catch {
      // ignore non-json lines
    }
  }
  return out;
}

function emptyDomain(domain: 'self' | 'partner' | 'relationship'): ExtractedSignals {
  const signals: Record<string, number | null> = {};
  for (const k of EXTRACTION_SIGNAL_KEYS) signals[k] = null;
  return {
    domain,
    signals,
    evidence: [],
    version: 'v1',
    confidence: 0.1,
  };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const logger = new CaptureLogger();
  const llm = new MockLlmRouter();
  const extractionService = new ExtractionV2Service(llm as any, logger as any, {} as any, {} as any);
  const persistenceService = new ExtractionV2PersistenceService(prisma as any, logger as any);

  const cases: CaseDef[] = [
    {
      caseId: 'pos-1',
      kind: 'positive',
      text: 'I want a serious relationship with clear intentions and explicit boundaries from day one.',
      llmSignals: { relationshipClarity: 8 },
      evidence: [{ signal: 'relationshipClarity', quote: 'clear intentions and explicit boundaries', reason: 'explicit relationship rules' }],
    },
    {
      caseId: 'pos-2',
      kind: 'positive',
      text: 'No games for me. I need exclusivity, labels, and direct communication.',
      llmSignals: { relationshipClarity: 7 },
      evidence: [{ signal: 'relationshipClarity', quote: 'No games for me. I need exclusivity, labels, and direct communication.', reason: 'explicit commitment expectations' }],
    },
    {
      caseId: 'pos-3',
      kind: 'positive',
      text: 'I know what I want in a partner: transparent communication and defined boundaries.',
      llmSignals: { relationshipClarity: 6 },
      evidence: [{ signal: 'relationshipClarity', quote: 'transparent communication and defined boundaries', reason: 'states relationship structure' }],
    },
    {
      caseId: 'neg-1',
      kind: 'negative',
      text: 'I like cooking, long walks, and good coffee.',
      llmSignals: { relationshipClarity: null },
      evidence: [],
    },
    {
      caseId: 'neg-2',
      kind: 'negative',
      text: 'I enjoy books and quiet weekends.',
      llmSignals: { relationshipClarity: 7 },
      evidence: [{ signal: 'relationshipClarity', quote: 'non-existing quote', reason: 'bad evidence' }],
    },
  ];

  console.log('caseId\traw self.relationshipClarity\tafter validateExtraction\tcanonical relationship_clarity_self\tpersisted DB relationship_clarity_self\tresult');
  let pass = 0;
  let fail = 0;

  for (const c of cases) {
    logger.entries = [];

    const payload: Record<string, unknown> = {
      domain: 'self',
      signals: c.llmSignals,
      evidence: c.evidence,
      confidence: 0.9,
      version: 'v1',
    };
    llm.setPayload(payload);

    const self = await extractionService.extractBaseSignals('self', c.text, `verify-${c.caseId}`);
    const extraction: ExtractionV2Result = {
      version: 'v2',
      extractedAt: new Date().toISOString(),
      base: {
        self,
        partner: emptyDomain('partner'),
        relationship: emptyDomain('relationship'),
      },
      interests: { self: [], partner: [], relationship: [] },
      negatives: { self: [], partner: [], relationship: [] },
      _usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUSD: 0, durationMs: 0 },
      _provenance: {
        extractorVersion: 'fixture_verify',
        promptHashes: { base: 'fixture', interests: 'fixture', negatives: 'fixture' },
      },
    };

    const profileId = `verify-self-rc-${c.caseId}`;
    await prisma.userProfile.upsert({
      where: { id: profileId },
      create: {
        id: profileId,
        name: `Verify ${c.caseId}`,
        aboutMe: c.text,
        aboutPartner: 'fixture',
        aboutRelationship: 'fixture',
      },
      update: {
        name: `Verify ${c.caseId}`,
        aboutMe: c.text,
        aboutPartner: 'fixture',
        aboutRelationship: 'fixture',
      },
    });

    await persistenceService.save({
      profileId,
      aboutMe: c.text,
      aboutPartner: 'fixture',
      aboutRelationship: 'fixture',
      extraction,
    });

    const row = await prisma.profileExtractionV2.findUnique({
      where: { profileId },
      select: { relationship_clarity_self: true },
    });

    const traces = parseTrace(logger.entries);
    const canonical = extraction.base.self.signals.relationshipClarity ?? null;
    const persisted = row?.relationship_clarity_self ?? null;

    const isPass =
      c.kind === 'positive'
        ? traces.raw_llm_output != null &&
          traces.validateExtraction != null &&
          traces.validateExtraction === canonical &&
          canonical === persisted
        : traces.validateExtraction == null && canonical == null && persisted == null;

    if (isPass) pass++;
    else fail++;

    console.log(
      `${c.caseId}\t${traces.raw_llm_output ?? 'null'}\t${traces.validateExtraction ?? 'null'}\t${canonical ?? 'null'}\t${persisted ?? 'null'}\t${isPass ? 'PASS' : 'FAIL'}`,
    );
  }

  console.log('');
  console.log(`total: ${cases.length}`);
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);
  if (fail === 0) {
    console.log('Original validation bug shape: FULLY VERIFIED and CLOSED.');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

