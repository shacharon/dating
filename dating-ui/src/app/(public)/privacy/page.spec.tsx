/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { DRAFT_FOOTER, LegalDocumentPage } from '@/components/legal/legal-document-page';

function loadPrivacyMarkdown(): string {
  return readFileSync(join(process.cwd(), 'content/legal/privacy.md'), 'utf8');
}

describe('Privacy page content', () => {
  it('renders draft footer marker', () => {
    const content = loadPrivacyMarkdown();
    render(<LegalDocumentPage title="Privacy Policy" content={content} />);
    expect(screen.getByText(DRAFT_FOOTER)).toBeTruthy();
    expect(screen.getByText(/What we collect/)).toBeTruthy();
  });

  it('discloses OpenAI content safety processing', () => {
    const content = loadPrivacyMarkdown();
    expect(content).toMatch(/AI and third-party processors/i);
    expect(content).toMatch(/OpenAI/);
    expect(content).toMatch(/content safety/i);
    expect(content).toMatch(/legitimate interest/i);
    expect(content).toMatch(/Moderation API/i);
  });
});
