/**
 * Test canonical repository queries with real data.
 * Demonstrates 3 query patterns using canonical array columns.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQueries() {
  console.log('=== Testing Canonical Repository Queries ===\n');

  // First, populate the test profile with sample data
  await setupTestData();

  console.log('Running 3 query examples on existing data...\n');

  // Query 1: Include interest "dancing"
  console.log('1. Query: Profiles WITH interest "dancing"\n');
  const query1 = `
    SELECT 
      "profileId",
      "interests_self",
      "coverageScore",
      "avgConfidence"
    FROM "ProfileExtractionV2"
    WHERE 'dancing' = ANY("interests_self")
    ORDER BY "coverageScore" DESC
    LIMIT 10;
  `;

  const result1 = await prisma.$queryRawUnsafe(query1);
  console.log('Results:');
  console.table(result1);
  console.log(`Found ${(result1 as any[]).length} profiles\n`);

  // Query 2: Exclude interest "swimming" AND include "dancing"
  console.log('2. Query: Profiles WITH "dancing" but WITHOUT "swimming"\n');
  const query2 = `
    SELECT 
      "profileId",
      "interests_self",
      "negatives_self",
      "coverageScore"
    FROM "ProfileExtractionV2"
    WHERE 'dancing' = ANY("interests_self")
      AND NOT ('swimming' = ANY("interests_self"))
    ORDER BY "coverageScore" DESC
    LIMIT 10;
  `;

  const result2 = await prisma.$queryRawUnsafe(query2);
  console.log('Results:');
  console.table(result2);
  console.log(`Found ${(result2 as any[]).length} profiles\n`);

  // Query 3: Min relationshipClarity >= 7 with interests
  console.log('3. Query: Profiles with relationshipClarity >= 7 AND interests\n');
  const query3 = `
    SELECT 
      "profileId",
      "interests_self",
      ("selfSignals"->>'relationshipClarity')::int as "relationshipClarity",
      "coverageScore",
      "avgConfidence"
    FROM "ProfileExtractionV2"
    WHERE ("selfSignals"->>'relationshipClarity')::int >= 7
      AND array_length("interests_self", 1) > 0
    ORDER BY "coverageScore" DESC
    LIMIT 10;
  `;

  const result3 = await prisma.$queryRawUnsafe(query3);
  console.log('Results:');
  console.table(result3);
  console.log(`Found ${(result3 as any[]).length} profiles\n`);

  // Query 4: Combined - interests + signals + exclude hard_no
  console.log('4. Query: WITH "dancing", WITHOUT "smoking" hard dealbreaker, relationshipClarity >= 7\n');
  const query4 = `
    SELECT 
      "profileId",
      "interests_self",
      "hard_no",
      ("selfSignals"->>'relationshipClarity')::int as "relationshipClarity",
      "coverageScore"
    FROM "ProfileExtractionV2"
    WHERE 'dancing' = ANY("interests_self")
      AND NOT ('smoking' = ANY("hard_no"))
      AND ("selfSignals"->>'relationshipClarity')::int >= 7
    ORDER BY "coverageScore" DESC
    LIMIT 10;
  `;

  const result4 = await prisma.$queryRawUnsafe(query4);
  console.log('Results:');
  console.table(result4);
  console.log(`Found ${(result4 as any[]).length} profiles\n`);

  // Show EXPLAIN for Query 1 to verify GIN index usage
  console.log('5. Query Plan for Query 1 (should use GIN index):\n');
  const explainQuery = `
    EXPLAIN (FORMAT JSON, ANALYZE false)
    SELECT "profileId"
    FROM "ProfileExtractionV2"
    WHERE 'dancing' = ANY("interests_self")
    LIMIT 10;
  `;

  const explain = await prisma.$queryRawUnsafe(explainQuery);
  console.log(JSON.stringify(explain, null, 2));

  await prisma.$disconnect();
}

async function setupTestData() {
  console.log('Setting up test data...\n');

  // Add more test profiles with canonical arrays
  const testProfiles = [
    {
      profileId: 'test-query-001',
      interests_self: ['dancing', 'hiking', 'cooking'],
      interests_partner: ['gym'],
      negatives_self: [],
      negatives_partner: [],
      soft_no: [],
      hard_no: [],
      selfSignals: { relationshipClarity: 8, ambition: 7 },
    },
    {
      profileId: 'test-query-002',
      interests_self: ['dancing', 'swimming', 'yoga'],
      interests_partner: ['travel'],
      negatives_self: [],
      negatives_partner: [],
      soft_no: ['pets'],
      hard_no: ['smoking'],
      selfSignals: { relationshipClarity: 6, emotionalDepth: 9 },
    },
    {
      profileId: 'test-query-003',
      interests_self: ['hiking', 'books'],
      interests_partner: [],
      negatives_self: ['drama'],
      negatives_partner: [],
      soft_no: [],
      hard_no: ['smoking', 'drugs'],
      selfSignals: { relationshipClarity: 9, independence: 5 },
    },
  ];

  for (const profile of testProfiles) {
    // Create parent profile
    await prisma.userProfile.upsert({
      where: { id: profile.profileId },
      create: {
        id: profile.profileId,
        name: `Test User ${profile.profileId}`,
        aboutMe: 'Test profile for canonical queries',
      },
      update: {},
    });

    // Create extraction record
    await prisma.profileExtractionV2.upsert({
      where: { profileId: profile.profileId },
      create: {
        profileId: profile.profileId,
        promptVersion: 'v2_test',
        textHash: 'test_hash',
        extractionJson: {} as any,
        selfSignals: profile.selfSignals as any,
        partnerSignals: {} as any,
        relationshipSignals: {} as any,
        coverageScore: 50,
        avgConfidence: 0.75,
        interests_self: profile.interests_self,
        interests_partner: profile.interests_partner,
        negatives_self: profile.negatives_self,
        negatives_partner: profile.negatives_partner,
        soft_no: profile.soft_no,
        hard_no: profile.hard_no,
      } as any,
      update: {
        interests_self: profile.interests_self,
        interests_partner: profile.interests_partner,
        negatives_self: profile.negatives_self,
        negatives_partner: profile.negatives_partner,
        soft_no: profile.soft_no,
        hard_no: profile.hard_no,
        selfSignals: profile.selfSignals as any,
      } as any,
    });
  }

  console.log(`✓ Created/updated ${testProfiles.length} test profiles\n`);
}

testQueries().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
