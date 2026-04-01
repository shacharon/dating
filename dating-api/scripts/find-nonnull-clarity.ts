import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const rows = await prisma.profileExtractionV2.findMany({
    select: {
      profileId: true,
      extractionJson: true,
      relationship_clarity_self: true,
      relationship_clarity_partner: true,
      relationship_clarity_relationship: true,
    },
    take: 500,
  });

  const hits = rows
    .map((row) => {
      const extraction = row.extractionJson as any;
      const self = extraction?.base?.self?.signals?.relationshipClarity ?? null;
      const partner = extraction?.base?.partner?.signals?.relationshipClarity ?? null;
      const relationship = extraction?.base?.relationship?.signals?.relationshipClarity ?? null;
      return {
        profileId: row.profileId,
        self,
        partner,
        relationship,
        dbSelf: row.relationship_clarity_self,
        dbPartner: row.relationship_clarity_partner,
        dbRelationship: row.relationship_clarity_relationship,
      };
    })
    .filter((row) => row.self != null && row.partner != null && row.relationship != null);

  console.log(`hits=${hits.length}`);
  console.table(hits.slice(0, 20));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
