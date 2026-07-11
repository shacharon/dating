/**
 * Ambiguous-phrasing regression suite (Sprint 17 Story 3).
 *
 * Breaking these tests = you made a dealbreaker fire on ambiguous text.
 * Do not delete this file to "fix" a taxonomy/regex PR.
 */

import { extractDealbreakerSignalsFromFreeText } from './dealbreaker-signals-text.extract';
import { resetDealbreakerHardDisabledTagsCacheForTests } from './dealbreaker-guardrails';

function hardSignals(aboutPartner: string) {
  resetDealbreakerHardDisabledTagsCacheForTests();
  delete process.env['DEALBREAKER_HARD_DISABLED_TAGS'];
  return extractDealbreakerSignalsFromFreeText({ aboutPartner }).signals.filter(
    (s) =>
      s.classification === 'HARD_EXCLUDE' || s.classification === 'HARD_REQUIRE',
  );
}

describe('dealbreaker ambiguous phrasing guardrails', () => {
  afterEach(() => {
    resetDealbreakerHardDisabledTagsCacheForTests();
    delete process.env['DEALBREAKER_HARD_DISABLED_TAGS'];
  });

  it.each([
    ['Not really into smokers, but not a dealbreaker'],
    ['used to smoke, quit two years ago'],
    ["I don't care about smoking"],
    ['prefer non-smokers if possible'],
    ['open to smokers'],
    ['would be nice if they did not smoke'],
    // lifestyle
    ['maybe kids someday, not sure'],
    ['open to partners with or without kids'],
    // values / social
    ['politics can be complicated'],
    ['I prefer less drama when possible'],
  ])('must not emit HARD for: %s', (text) => {
    expect(hardSignals(text)).toEqual([]);
  });
});
