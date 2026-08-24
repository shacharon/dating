import { createHash } from 'node:crypto';
import {
  getSystemPromptForDomain,
  SYSTEM_PROMPT_HASH,
} from './extraction-prompt.builder';
import { joinExpansionSelfShadowBlocks } from '../expansion/expansion-manifest';

describe('extraction-prompt.builder (sprint-58 story 2)', () => {
  it('returns non-empty domain prompts with expansion injection for self', () => {
    const self = getSystemPromptForDomain('self');
    const relationship = getSystemPromptForDomain('relationship');
    const partner = getSystemPromptForDomain('partner');

    expect(self.length).toBeGreaterThan(100);
    expect(relationship.length).toBeGreaterThan(100);
    expect(partner.length).toBeGreaterThan(100);

    const selfShadow = joinExpansionSelfShadowBlocks();
    expect(selfShadow.length).toBeGreaterThan(100);
    expect(self).toContain(selfShadow.slice(0, 80));
  });

  it('SYSTEM_PROMPT_HASH matches sha256(self prompt).slice(0, 12)', () => {
    const self = getSystemPromptForDomain('self');
    const expected = createHash('sha256').update(self).digest('hex').slice(0, 12);
    expect(SYSTEM_PROMPT_HASH).toBe(expected);
  });
});
