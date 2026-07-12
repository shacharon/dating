import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/legal/legal-document-page';

export const metadata: Metadata = {
  title: 'Terms of Use',
};

function loadTermsMarkdown(): string {
  return readFileSync(join(process.cwd(), 'content/legal/terms.md'), 'utf8');
}

export default function TermsPage() {
  return <LegalDocumentPage title="Terms of Use" content={loadTermsMarkdown()} />;
}
