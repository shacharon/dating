const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';

const PROFILE_IDS = [
  'val-test-neg-001',
  'val-test-003',
  'val-test-001',
  '13',
  '21',
];

async function main(): Promise<void> {
  console.log('profileId\textracted negatives (self/partner/relationship)\tresult');
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
            self?: {
              negativePreferences?: string[];
              softNo?: string[];
              dealbreakers?: string[];
            };
            partner?: {
              negativePreferences?: string[];
              softNo?: string[];
              dealbreakers?: string[];
            };
            relationship?: {
              negativePreferences?: string[];
              softNo?: string[];
              dealbreakers?: string[];
            };
          };
        };
      };

      const extracted = {
        self: {
          negativePreferences: body.extraction?.base?.self?.negativePreferences ?? [],
          softNo: body.extraction?.base?.self?.softNo ?? [],
          dealbreakers: body.extraction?.base?.self?.dealbreakers ?? [],
        },
        partner: {
          negativePreferences: body.extraction?.base?.partner?.negativePreferences ?? [],
          softNo: body.extraction?.base?.partner?.softNo ?? [],
          dealbreakers: body.extraction?.base?.partner?.dealbreakers ?? [],
        },
        relationship: {
          negativePreferences: body.extraction?.base?.relationship?.negativePreferences ?? [],
          softNo: body.extraction?.base?.relationship?.softNo ?? [],
          dealbreakers: body.extraction?.base?.relationship?.dealbreakers ?? [],
        },
      };

      const hasAny =
        extracted.self.negativePreferences.length > 0 ||
        extracted.self.softNo.length > 0 ||
        extracted.self.dealbreakers.length > 0 ||
        extracted.partner.negativePreferences.length > 0 ||
        extracted.partner.softNo.length > 0 ||
        extracted.partner.dealbreakers.length > 0 ||
        extracted.relationship.negativePreferences.length > 0 ||
        extracted.relationship.softNo.length > 0 ||
        extracted.relationship.dealbreakers.length > 0;

      console.log(`${id}\t${JSON.stringify(extracted)}\t${hasAny ? 'PASS' : 'FAIL'}`);
    } catch {
      console.log(`${id}\t[]\tFAIL`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

