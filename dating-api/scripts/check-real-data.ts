/**
 * Check real production data statistics.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRealData() {
  console.log('=== Real Production Data Statistics ===\n');

  const stats = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE array_length(interests_self, 1) > 0) as with_interests,
      COUNT(*) FILTER (WHERE array_length(hard_no, 1) > 0) as with_hard_no,
      COUNT(*) FILTER (WHERE array_length(soft_no, 1) > 0) as with_soft_no
    FROM "ProfileExtractionV2"
  `);

  console.log('Overall Stats:');
  console.table(stats);
  console.log('\n');

  // Get sample profiles with interests
  const withInterests = await prisma.$queryRawUnsafe(`
    SELECT 
      "profileId",
      "interests_self",
      "hard_no",
      "coverageScore"
    FROM "ProfileExtractionV2"
    WHERE array_length("interests_self", 1) > 0
    ORDER BY "coverageScore" DESC
    LIMIT 5
  `);

  console.log('Sample profiles WITH interests:');
  console.table(withInterests);
  console.log('\n');

  await prisma.$disconnect();
}

checkRealData().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
