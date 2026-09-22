import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const sql = readFileSync(
  join(
    __dirname,
    '../../prisma/migrations/20260922160000_place_tables/migration.sql',
  ),
  'utf8',
);

function insertBody(table: string): string {
  const marker = `INSERT INTO "${table}"`;
  const start = sql.indexOf(marker);
  if (start < 0) throw new Error(`missing insert for ${table}`);
  const valuesAt = sql.indexOf('VALUES', start);
  const end = sql.indexOf(';', valuesAt);
  return sql.slice(valuesAt + 'VALUES'.length, end);
}

function tuples(body: string): string[] {
  return body
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('('));
}

describe('place tables migration', () => {
  const countryRows = tuples(insertBody('country'));
  const stateRows = tuples(insertBody('us_state'));
  const cityRows = tuples(insertBody('city'));

  it('loads every ISO country with the codes Story 6 needs', () => {
    expect(countryRows).toHaveLength(249);
    for (const code of ['US', 'IL', 'GB', 'ES', 'FR', 'DE', 'IT', 'PL', 'NL', 'PT']) {
      expect(sql).toContain(`('${code}',`);
    }
  });

  it('loads 50 states plus DC', () => {
    expect(stateRows).toHaveLength(51);
    expect(sql).toContain(`('CA', 'California')`);
    expect(sql).toContain(`('DC', 'District of Columbia')`);
  });

  it('gives Israel Hebrew names and California coordinates', () => {
    const hebrewBeforeLat = /, '[^']+', -?\d+\.\d{6}, -?\d+\.\d{6}\),?$/;
    const nullHebrewBeforeLat = /, NULL, -?\d+\.\d{6}, -?\d+\.\d{6}\),?$/;

    const israel = cityRows.filter((row) => row.startsWith(`('city_IL_`));
    expect(israel).toHaveLength(15);
    for (const row of israel) {
      expect(row).toMatch(hebrewBeforeLat);
    }

    const california = cityRows.filter((row) => row.includes(`'US', 'CA'`));
    expect(california).toHaveLength(10);
    for (const row of california) {
      expect(row).toMatch(nullHebrewBeforeLat);
    }
  });

  it('keeps Hebrew names on Israel only and checks coordinates', () => {
    const hebrewBeforeLat = /, '[^']+', -?\d+\.\d{6}, -?\d+\.\d{6}\),?$/;
    const hebrewOutsideIsrael = cityRows.filter(
      (row) => !row.startsWith(`('city_IL_`) && hebrewBeforeLat.test(row),
    );
    expect(hebrewOutsideIsrael).toEqual([]);
    expect(sql).toContain('city_name_he_iff_il_check');
    expect(sql).toContain('city_lat_lng_check');
    expect(sql).toContain('city_us_state_iff_us_check');
    expect(cityRows).toHaveLength(195);
  });
});

describe('place tables in the local database', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const live = process.env.CI === 'true' ? it.skip : it;

  live('returns Israel cities with Hebrew names and California cities with coordinates', async () => {
    const [row] = await prisma.$queryRaw<
      {
        countries: number;
        states: number;
        il: number;
        ca: number;
        hebrew_outside: number;
      }[]
    >`
      SELECT
        (SELECT COUNT(*)::int FROM "country") AS countries,
        (SELECT COUNT(*)::int FROM "us_state") AS states,
        (SELECT COUNT(*)::int FROM "city" WHERE "country_code" = 'IL' AND "name_he" IS NOT NULL) AS il,
        (SELECT COUNT(*)::int FROM "city" WHERE "country_code" = 'US' AND "us_state_code" = 'CA' AND "lat" IS NOT NULL AND "lng" IS NOT NULL AND "name_he" IS NULL) AS ca,
        (SELECT COUNT(*)::int FROM "city" WHERE "country_code" <> 'IL' AND "name_he" IS NOT NULL) AS hebrew_outside
    `;
    expect(row).toEqual({
      countries: 249,
      states: 51,
      il: 15,
      ca: 10,
      hebrew_outside: 0,
    });
  });
});
