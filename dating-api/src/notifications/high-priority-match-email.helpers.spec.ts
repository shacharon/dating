import {
  buildHighPriorityMatchEmailBodies,
  isHighPriorityRankScore,
  pickNewHighPriorityCandidate,
} from './high-priority-match-email.helpers';

describe('high-priority-match-email.helpers', () => {
  describe('isHighPriorityRankScore', () => {
    it('uses ≥85', () => {
      expect(isHighPriorityRankScore(85)).toBe(true);
      expect(isHighPriorityRankScore(84.9)).toBe(false);
      expect(isHighPriorityRankScore(-1)).toBe(false);
      expect(isHighPriorityRankScore(Number.NaN)).toBe(false);
    });
  });

  describe('pickNewHighPriorityCandidate', () => {
    const empty = new Set<string>();

    it('picks highest newly HIGH not previously HIGH', () => {
      const picked = pickNewHighPriorityCandidate({
        priorRows: [
          { candidateProfileId: 'a', matchScore: 80, hardBlocked: false },
          { candidateProfileId: 'b', matchScore: 90, hardBlocked: false },
        ],
        newRows: [
          { candidateProfileId: 'a', matchScore: 88, hardBlocked: false },
          { candidateProfileId: 'b', matchScore: 91, hardBlocked: false },
          { candidateProfileId: 'c', matchScore: 95, hardBlocked: false },
        ],
        excludedCandidateProfileIds: empty,
        alreadyNotifiedCandidateProfileIds: empty,
      });
      // b was already HIGH — not new; a crossed 85; c is new — c wins on score
      expect(picked?.candidateProfileId).toBe('c');
      expect(picked?.matchScore).toBe(95);
    });

    it('treats prior hard-blocked HIGH as newly HIGH when unblocked', () => {
      const picked = pickNewHighPriorityCandidate({
        priorRows: [
          { candidateProfileId: 'x', matchScore: 92, hardBlocked: true },
        ],
        newRows: [
          { candidateProfileId: 'x', matchScore: 92, hardBlocked: false },
        ],
        excludedCandidateProfileIds: empty,
        alreadyNotifiedCandidateProfileIds: empty,
      });
      expect(picked?.candidateProfileId).toBe('x');
    });

    it('excludes PASS/BLOCK and already notified', () => {
      const picked = pickNewHighPriorityCandidate({
        priorRows: [],
        newRows: [
          { candidateProfileId: 'pass', matchScore: 99, hardBlocked: false },
          { candidateProfileId: 'noted', matchScore: 98, hardBlocked: false },
          { candidateProfileId: 'ok', matchScore: 90, hardBlocked: false },
        ],
        excludedCandidateProfileIds: new Set(['pass']),
        alreadyNotifiedCandidateProfileIds: new Set(['noted']),
      });
      expect(picked?.candidateProfileId).toBe('ok');
    });

    it('returns null when none newly HIGH', () => {
      expect(
        pickNewHighPriorityCandidate({
          priorRows: [
            { candidateProfileId: 'a', matchScore: 90, hardBlocked: false },
          ],
          newRows: [
            { candidateProfileId: 'a', matchScore: 91, hardBlocked: false },
          ],
          excludedCandidateProfileIds: empty,
          alreadyNotifiedCandidateProfileIds: empty,
        }),
      ).toBeNull();
    });

    it('tie-breaks by candidateProfileId asc', () => {
      const picked = pickNewHighPriorityCandidate({
        priorRows: [],
        newRows: [
          { candidateProfileId: 'z', matchScore: 90, hardBlocked: false },
          { candidateProfileId: 'a', matchScore: 90, hardBlocked: false },
        ],
        excludedCandidateProfileIds: empty,
        alreadyNotifiedCandidateProfileIds: empty,
      });
      expect(picked?.candidateProfileId).toBe('a');
    });
  });

  describe('buildHighPriorityMatchEmailBodies', () => {
    it('includes score, CTA, optional opener; no mutual wording', () => {
      const { textBody, htmlBody } = buildHighPriorityMatchEmailBodies({
        matchLabel: 'Sarah',
        ageYears: 32,
        matchScore: 92.4,
        reason: 'You both value deep conversations.',
        opener: 'Have you hiked the Israel Trail?',
        matchUrl: 'http://localhost:3000/dating/me-matches/cand1',
        settingsUrl: 'http://localhost:3000/profile?tab=settings#notifications',
      });
      expect(textBody).toContain('New high-compatibility match');
      expect(textBody).toContain('Sarah, 32');
      expect(textBody).toContain('92%');
      expect(textBody).toContain('Suggested opener');
      expect(textBody).not.toContain('You matched with');
      expect(htmlBody).toContain('View profile');
      expect(htmlBody).toContain('#059669');
      expect(htmlBody).toContain('Have you hiked the Israel Trail?');
    });
  });
});
