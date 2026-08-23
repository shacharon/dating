import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const uiRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(uiRoot, 'src/app/dating/me-matches');
const monolithPath = path.join(dir, 'match-why-section.spec.tsx');
const lines = fs.readFileSync(monolithPath, 'utf8').split(/\r?\n/);

const header = `/** @vitest-environment jsdom */
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { getCopy } from '@/lib/i18n';
import { MatchWhySection } from './match-why-section';
import { baseMatch } from './match-why-section.spec-support';

afterEach(() => {
  cleanup();
});
`;

const support = `import type { MeMatchItemDto } from '@/lib/me-matches-api';

export function baseMatch(
  explainability: MeMatchItemDto['explainability'],
): MeMatchItemDto {
  return {
    id: 'prof-expansion-01',
    nickname: 'Test',
    gender: 'FEMALE',
    ageYears: 30,
    locationLabel: 'Tel Aviv',
    analyzedAt: null,
    hasEvaluation: true,
    matchScore: 82,
    explainability,
    recommendation: null,
  };
}
`;

const ranges = [
  {
    file: 'match-why-section.expansion-01-04.spec.tsx',
    label: '01-04',
    start: 29,
    end: 253,
  },
  {
    file: 'match-why-section.expansion-05-09.spec.tsx',
    label: '05-09',
    start: 254,
    end: 474,
  },
  {
    file: 'match-why-section.expansion-10-13.spec.tsx',
    label: '10-13',
    start: 475,
    end: 852,
  },
  {
    file: 'match-why-section.expansion-14-15.spec.tsx',
    label: '14-15',
    start: 853,
    end: 1120,
  },
];

fs.writeFileSync(path.join(dir, 'match-why-section.spec-support.tsx'), support);

for (const r of ranges) {
  const body = lines.slice(r.start - 1, r.end).join('\n');
  const indented = body
    .split('\n')
    .map((line) => (line.length ? `  ${line}` : line))
    .join('\n');
  const content =
    header +
    `\ndescribe('MatchWhySection expansion chips (${r.label})', () => {\n` +
    indented +
    `\n});\n`;
  fs.writeFileSync(path.join(dir, r.file), content);
}

const policy = `import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';

/** FE Sprint 07 Story 01 — keep split match-why-section specs under reviewable size. */
const MAX_NON_EMPTY_LINES = 400;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\\r?\\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('match-why-section spec size policy', () => {
  const dir = __dirname;

  const splitSpecFiles = [
    'match-why-section.spec-support.tsx',
    'match-why-section.expansion-01-04.spec.tsx',
    'match-why-section.expansion-05-09.spec.tsx',
    'match-why-section.expansion-10-13.spec.tsx',
    'match-why-section.expansion-14-15.spec.tsx',
  ];

  it.each(splitSpecFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(dir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_NON_EMPTY_LINES);
    },
  );

  it('does not keep monolith match-why-section.spec.tsx', () => {
    expect(fs.existsSync(path.join(dir, 'match-why-section.spec.tsx'))).toBe(
      false,
    );
  });
});
`;

fs.writeFileSync(
  path.join(dir, 'match-why-section-spec-size.policy.spec.ts'),
  policy,
);
fs.unlinkSync(monolithPath);

function nonEmpty(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '').length;
}

for (const f of [
  'match-why-section.spec-support.tsx',
  ...ranges.map((r) => r.file),
  'match-why-section-spec-size.policy.spec.ts',
]) {
  console.log(f, 'nonEmpty=', nonEmpty(path.join(dir, f)));
}
console.log('monolith exists?', fs.existsSync(monolithPath));
