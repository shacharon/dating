import {
  buildProfileExcerpts,
  EXCERPT_MAX_CHARS,
  EXCERPT_MAX_COUNT,
  redactProfileFreeText,
} from './match-narrative-redact';

describe('match-narrative-redact', () => {
  it('redacts email, phone, url, handle', () => {
    const raw =
      'I love solitude and hiking. Email me at jane@example.com or call 555-123-4567. Also www.mysite.com and @jane_doe on social.';
    const cleaned = redactProfileFreeText(raw);
    expect(cleaned.toLowerCase()).not.toContain('jane@example.com');
    expect(cleaned).not.toMatch(/555/);
    expect(cleaned.toLowerCase()).not.toContain('www.mysite');
    expect(cleaned).not.toContain('@jane_doe');
    expect(cleaned.toLowerCase()).not.toContain('redacted');
    expect(cleaned.toLowerCase()).toContain('solitude');
    expect(cleaned.toLowerCase()).toContain('hiking');
  });

  it('truncates long text at sentence or word boundary', () => {
    const long = `${'Solitude keeps me grounded every morning. '.repeat(8)}Extra tail words here.`;
    const cleaned = redactProfileFreeText(long);
    expect(cleaned.length).toBeGreaterThan(20);
    const excerpts = buildProfileExcerpts({
      viewer: { aboutMe: long },
      candidate: {},
    });
    expect(excerpts).toHaveLength(1);
    expect(excerpts[0].text.length).toBeLessThanOrEqual(EXCERPT_MAX_CHARS);
  });

  it('returns empty when only PII remains', () => {
    expect(redactProfileFreeText('x@y.com')).toBe('');
  });

  it('scrubs deny phrases without leaving [redacted] markers', () => {
    const cleaned = redactProfileFreeText(
      'I value quiet mornings and never share my credit card or passport details online.',
    );
    expect(cleaned.toLowerCase()).not.toContain('credit card');
    expect(cleaned.toLowerCase()).not.toContain('passport');
    expect(cleaned.toLowerCase()).not.toContain('redacted');
    expect(cleaned.toLowerCase()).toContain('quiet mornings');
  });

  it('builds capped excerpts in field priority order', () => {
    const excerpts = buildProfileExcerpts({
      viewer: {
        aboutMe:
          'I need long quiet mornings with coffee and solitude before the world wakes up.',
        aboutPartner: 'I want someone who values honesty and calm evenings.',
        aboutRelationship: 'Partnership should feel steady and kind over years.',
      },
      candidate: {
        aboutMe:
          'Solitude fuels my creative work and I protect weekends for deep focus.',
        aboutPartner: 'Looking for a partner who enjoys slow travel and books.',
        aboutRelationship: 'I want a relationship built on trust and humor.',
      },
    });
    expect(excerpts.length).toBeLessThanOrEqual(EXCERPT_MAX_COUNT);
    expect(excerpts.length).toBe(4);
    expect(excerpts[0]).toMatchObject({ role: 'viewer', field: 'aboutMe' });
    expect(excerpts[1]).toMatchObject({ role: 'candidate', field: 'aboutMe' });
    expect(excerpts[2]).toMatchObject({
      role: 'viewer',
      field: 'aboutPartner',
    });
    expect(excerpts[3]).toMatchObject({
      role: 'candidate',
      field: 'aboutPartner',
    });
    for (const e of excerpts) {
      expect(e.text.length).toBeLessThanOrEqual(EXCERPT_MAX_CHARS);
      expect(e.text.length).toBeGreaterThanOrEqual(20);
    }
  });

  it('omits empty / all-redacted about fields', () => {
    expect(
      buildProfileExcerpts({
        viewer: { aboutMe: 'a@b.com' },
        candidate: { aboutMe: '   ' },
      }),
    ).toEqual([]);
  });
});
