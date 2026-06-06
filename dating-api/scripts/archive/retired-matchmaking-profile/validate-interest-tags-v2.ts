import 'dotenv/config';

/**
 * Validates interestTags v1+v2 after `npm run seed:interest-tags-v2-validation`.
 *
 * Output: scripts/.interest-tags-v2-validation-output.json (and the same JSON to stdout).
 *
 * Prerequisites: DATABASE_URL
 *
 * Run: npm run validate:interest-tags-v2
 */
import { INTEREST_TAGS_V2_VALIDATION_ID_PREFIX } from './interest-tags-v2-validation.constants';
import { runInterestTagsV2Validation } from './interest-tags-v2-validation.lib';

void runInterestTagsV2Validation({
  idPrefixes: [INTEREST_TAGS_V2_VALIDATION_ID_PREFIX],
  outputBasename: '.interest-tags-v2-validation-output.json',
  validatorLabel: 'interest-tags-v2',
  seedHint: 'Run: npm run seed:interest-tags-v2-validation',
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
