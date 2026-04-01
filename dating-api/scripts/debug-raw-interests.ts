import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const PROFILES_DIR = join(process.cwd(), 'data', 'profiles');

async function pickProfileIds(limit: number): Promise<string[]> {
  const files = (await readdir(PROFILES_DIR))
    .filter((f) => f.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, Math.max(limit * 2, limit));

  const ids: string[] = [];
  for (const file of files) {
    try {
      const raw = await readFile(join(PROFILES_DIR, file), 'utf8');
      const json = JSON.parse(raw) as { id?: string; texts?: { aboutMe?: string } };
      if (typeof json.id === 'string' && json.id.trim()) {
        ids.push(json.id.trim());
      }
      if (ids.length >= limit) break;
    } catch {
      // skip unreadable json
    }
  }
  return ids.slice(0, limit);
}

function formatList(items: unknown): string {
  if (!Array.isArray(items)) return '[]';
  return `[${items.map((x) => JSON.stringify(x)).join(', ')}]`;
}

async function main(): Promise<void> {
  const ids = await pickProfileIds(5);
  if (ids.length === 0) {
    console.log('No profiles found.');
    return;
  }

  console.log('profileId\tself.rawInterests\tpartner.rawInterests\trelationship.rawInterests');
  for (const id of ids) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/profiles/${encodeURIComponent(id)}/analyze-v2?force=1`,
        { method: 'POST' },
      );
      const bodyText = await res.text();
      if (!res.ok) {
        console.log(`${id}\tERROR ${res.status}\t-\t-`);
        continue;
      }
      const body = JSON.parse(bodyText) as {
        extraction?: {
          base?: {
            self?: { rawInterests?: string[] };
            partner?: { rawInterests?: string[] };
            relationship?: { rawInterests?: string[] };
          };
        };
      };
      const selfRaw = body.extraction?.base?.self?.rawInterests ?? [];
      const partnerRaw = body.extraction?.base?.partner?.rawInterests ?? [];
      const relationshipRaw = body.extraction?.base?.relationship?.rawInterests ?? [];
      console.log(
        `${id}\t${formatList(selfRaw)}\t${formatList(partnerRaw)}\t${formatList(relationshipRaw)}`,
      );
    } catch {
      console.log(`${id}\tERROR\t-\t-`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

