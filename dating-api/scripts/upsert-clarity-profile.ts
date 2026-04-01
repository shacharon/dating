import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.userProfile.upsert({
    where: { id: 'clarity-e2e-001' },
    create: {
      id: 'clarity-e2e-001',
      name: 'Clarity E2E',
      aboutMe:
        'I am very clear about relationship expectations: explicit labels, exclusivity, boundaries, and transparent communication from day one.',
      aboutPartner:
        'I want a partner who values defined boundaries, clear labels, exclusivity, and direct communication about commitment.',
      aboutRelationship:
        'For me, a healthy relationship has explicit agreements, exclusivity, named boundaries, and consistent transparent check-ins.',
    },
    update: {},
  });
  console.log('upserted clarity-e2e-001');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
