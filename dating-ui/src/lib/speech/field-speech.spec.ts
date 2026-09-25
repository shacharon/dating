import { describe, expect, it } from 'vitest';
import { appendTranscript } from './field-speech';

describe('appendTranscript', () => {
  it('appends spoken text after existing text', () => {
    expect(appendTranscript('Hello', 'world')).toBe('Hello world');
  });

  it('uses the spoken text when the field is empty', () => {
    expect(appendTranscript('', '  שלום  ')).toBe('שלום');
  });

  it('ignores an empty recognition result', () => {
    expect(appendTranscript('Hello', '   ')).toBe('Hello');
  });
});
