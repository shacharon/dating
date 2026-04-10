import 'dotenv/config';

/**
 * Validates personalityTraits v1+v2 after `npm run seed:personality-v2-validation`.
 *
 * Output: scripts/.personality-v2-validation-output.json (same JSON to stdout).
 *
 * Prerequisites: DATABASE_URL
 *
 * Run: npm run validate:personality-v2
 */
import {
  PERSONALITY_V2_VALIDATION_ID_PREFIX,
  PERSONALITY_V2_VALIDATION_LEGACY_ID_PREFIX,
} from './personality-v2-validation.constants';
import { runPersonalityV2Validation } from './personality-v2-validation.lib';

void runPersonalityV2Validation({
  idPrefixes: [PERSONALITY_V2_VALIDATION_ID_PREFIX, PERSONALITY_V2_VALIDATION_LEGACY_ID_PREFIX],
  outputBasename: '.personality-v2-validation-output.json',
  validatorLabel: 'personality-v2',
  seedHint: 'Run: npm run seed:personality-v2-validation',
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
