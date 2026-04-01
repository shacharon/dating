import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const row = await prisma.profileExtractionV2.findUnique({
    where: { profileId: 'clarity-e2e-001' },
    select: {
      relationship_clarity_self: true,
      relationship_clarity_partner: true,
      relationship_clarity_relationship: true,
      extractionJson: true,
    },
  });

  if (!row) {
    console.log('missing row');
    return;
  }

  const extraction = row.extractionJson as any;
  const source = {
    self: extraction?.base?.self?.signals?.relationshipClarity ?? null,
    partner: extraction?.base?.partner?.signals?.relationshipClarity ?? null,
    relationship: extraction?.base?.relationship?.signals?.relationshipClarity ?? null,
  };
  const db = {
    self: row.relationship_clarity_self,
    partner: row.relationship_clarity_partner,
    relationship: row.relationship_clarity_relationship,
  };

  console.log('db', db);
  console.log('source', source);
  console.log('match', {
    self: db.self === source.self,
    partner: db.partner === source.partner,
    relationship: db.relationship === source.relationship,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
