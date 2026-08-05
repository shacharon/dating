/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { buildSupportMailto } from './support-mailto';

describe('buildSupportMailto', () => {
  it('builds subject and body for ops inbox without encoding the address', () => {
    const href = buildSupportMailto({
      to: 'support@piza.example',
      issueTypeLabel: 'Photo upload failed',
      description: 'Stuck on pending',
      replyEmail: 'user@example.com',
    });
    expect(href.startsWith('mailto:support@piza.example?')).toBe(true);
    expect(href).not.toContain('support%40');
    expect(href).toContain(encodeURIComponent('Piza support: Photo upload failed'));
    expect(href).toContain(encodeURIComponent('Stuck on pending'));
    expect(href).toContain(encodeURIComponent('user@example.com'));
  });
});
