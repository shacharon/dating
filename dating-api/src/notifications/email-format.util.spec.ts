import { displayLabel, escapeHtml } from './email-format.util';

describe('email-format.util', () => {
  describe('escapeHtml', () => {
    it('escapes amp lt gt and quotes', () => {
      expect(escapeHtml(`a&b<c>d"e`)).toBe('a&amp;b&lt;c&gt;d&quot;e');
    });
  });

  describe('displayLabel', () => {
    it('prefers nickname over displayName', () => {
      expect(displayLabel(' Nick ', ' Display ')).toBe('Nick');
    });

    it('falls back to displayName', () => {
      expect(displayLabel('  ', 'Display')).toBe('Display');
      expect(displayLabel(null, 'Display')).toBe('Display');
    });

    it('falls back to Someone', () => {
      expect(displayLabel(null, null)).toBe('Someone');
      expect(displayLabel('', '')).toBe('Someone');
    });
  });
});
