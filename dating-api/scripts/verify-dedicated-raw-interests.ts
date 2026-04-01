const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';

const PROFILE_IDS = [
  'val-test-001',
  'val-test-003',
  'val-test-neg-001',
  'test-maya-001',
  'test-noa-003',
];

async function main(): Promise<void> {
  console.log('profileId\textracted rawInterests\tresult');
  for (const id of PROFILE_IDS) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/profiles/${encodeURIComponent(id)}/analyze-v2?force=1`,
        { method: 'POST' },
      );
      const text = await res.text();
      if (!res.ok) {
        console.log(`${id}\t[]\tFAIL (${res.status})`);
        continue;
      }
      const body = JSON.parse(text) as {
        extraction?: {
          base?: {
            self?: { rawInterests?: string[] };
            partner?: { rawInterests?: string[] };
            relationship?: { rawInterests?: string[] };
          };
        };
      };

      const extracted = {
        self: body.extraction?.base?.self?.rawInterests ?? [],
        partner: body.extraction?.base?.partner?.rawInterests ?? [],
        relationship: body.extraction?.base?.relationship?.rawInterests ?? [],
      };
      const hasAny =
        extracted.self.length > 0 ||
        extracted.partner.length > 0 ||
        extracted.relationship.length > 0;
      console.log(
        `${id}\t${JSON.stringify(extracted)}\t${hasAny ? 'PASS' : 'FAIL'}`,
      );
    } catch {
      console.log(`${id}\t[]\tFAIL`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

