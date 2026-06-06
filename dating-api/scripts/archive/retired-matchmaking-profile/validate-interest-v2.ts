import 'dotenv/config';

/**
 * Validates interestTags v1+v2 after seed-interest-tags-v2-validation (or legacy seed-interest-v2-validation):
 * extraction → canonical → ranking; coverage, canonical tags, grounded notes, eligibility invariance, rank stability.
 *
 * Prerequisites: DATABASE_URL + npm run seed:interest-tags-v2-validation (or npm run seed:interest-v2-validation)
 *
 * Run: npm run validate:interest-v2
 */
import { runInterestTagsV2Validation } from './interest-tags-v2-validation.lib';

/** Prefer `seed:interest-tags-v2-validation`; legacy `seed:interest-v2-validation` uses the second prefix. */
const VALIDATION_ID_PREFIXES = ['synthetic-interest-tags-v2-', 'synthetic-it-v2-'] as const;

void runInterestTagsV2Validation({
  idPrefixes: VALIDATION_ID_PREFIXES,
  outputBasename: '.interest-v2-validation-output.json',
  validatorLabel: 'interest-v2',
  seedHint: 'Run: npm run seed:interest-tags-v2-validation',
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
