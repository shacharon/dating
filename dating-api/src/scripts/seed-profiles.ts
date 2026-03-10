/**
 * CLI script: read profiles.json and insert into UserProfilesRepository.
 * - Assigns id if missing
 * - Saves raw text fields: aboutMe, aboutPartner, aboutRelationship
 * - Does not compute matches
 *
 * Run: npm run seed-profiles
 * Optional: PROFILES_JSON_PATH=/path/to/profiles.json
 */

import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { AppModule } from '../app.module';
import { SeedProfilesService } from '../profiles/seed-profiles.service';

const DEFAULT_PATH = join(process.cwd(), 'scripts', 'profiles.json');

async function main(): Promise<void> {
  const filePath = process.env.PROFILES_JSON_PATH?.trim() || DEFAULT_PATH;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const seed = app.get(SeedProfilesService);
  const result = await seed.seedFromFile(filePath);

  await app.close();

  console.log(`Read ${filePath}`);
  console.log(`Inserted ${result.inserted} profiles.`);
  if (result.ids.length > 0 && result.ids.length <= 20) {
    console.log('Ids:', result.ids.join(', '));
  } else if (result.ids.length > 20) {
    console.log('Ids (first 5):', result.ids.slice(0, 5).join(', '), '...');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
