import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const rows = await prisma.profileExtractionV2.findMany({
    where: {
      relationship_clarity_self: { not: null },
      relationship_clarity_partner: { not: null },
      relationship_clarity_relationship: { not: null },
    },
    select: {
      profileId: true,
      relationship_clarity_self: true,
      relationship_clarity_partner: true,
      relationship_clarity_relationship: true,
    },
    take: 20,
  });

  console.table(rows);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
