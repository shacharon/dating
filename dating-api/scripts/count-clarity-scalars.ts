import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const total = await prisma.profileExtractionV2.count();
  const self = await prisma.profileExtractionV2.count({
    where: { relationship_clarity_self: { not: null } },
  });
  const partner = await prisma.profileExtractionV2.count({
    where: { relationship_clarity_partner: { not: null } },
  });
  const relationship = await prisma.profileExtractionV2.count({
    where: { relationship_clarity_relationship: { not: null } },
  });
  const all = await prisma.profileExtractionV2.count({
    where: {
      relationship_clarity_self: { not: null },
      relationship_clarity_partner: { not: null },
      relationship_clarity_relationship: { not: null },
    },
  });

  console.log({ total, self, partner, relationship, all });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
