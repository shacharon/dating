/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { DRAFT_FOOTER, LegalDocumentPage } from '@/components/legal/legal-document-page';

describe('Privacy page content', () => {
  it('renders draft footer marker', () => {
    const content = readFileSync(
      join(process.cwd(), 'content/legal/privacy.md'),
      'utf8',
    );
    render(<LegalDocumentPage title="Privacy Policy" content={content} />);
    expect(screen.getByText(DRAFT_FOOTER)).toBeTruthy();
    expect(screen.getByText(/What we collect/)).toBeTruthy();
  });
});
