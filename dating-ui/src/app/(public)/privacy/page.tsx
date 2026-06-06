import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/legal/legal-document-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

function loadPrivacyMarkdown(): string {
  return readFileSync(
    join(process.cwd(), 'content/legal/privacy.md'),
    'utf8',
  );
}

export default function PrivacyPage() {
  return (
    <LegalDocumentPage title="Privacy Policy" content={loadPrivacyMarkdown()} />
  );
}
