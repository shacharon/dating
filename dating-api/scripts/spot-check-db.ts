/**
 * Spot-check DB query to verify denorm and normalized columns match
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const profiles = await prisma.userProfile.findMany({
      where: { status: 'ANALYZED' },
      select: {
        id: true,
        interestsTop: true,
        sigEmotionalDepth: true,
        sigLifestylePace: true,
        sigConflictStyle: true,
        sigIndependence: true,
        sigSocialBattery: true,
        signals: {
          select: {
            signalKey: true,
            signalValue: true,
          },
        },
        interests: {
          orderBy: { rank: 'asc' },
          take: 3,
          select: {
            tag: true,
          },
        },
      },
      take: 5,
    });

    console.log('\n=== SPOT CHECK: Denorm vs Normalized Columns ===\n');
    for (const p of profiles) {
      console.log(`Profile: ${p.id}`);
      console.log(`  Denorm interests: [${p.interestsTop.join(', ')}]`);
      console.log(`  Normalized interests: [${p.interests.map((i) => i.tag).join(', ')}]`);
      console.log(`  Denorm signals: ED=${p.sigEmotionalDepth} LP=${p.sigLifestylePace} CS=${p.sigConflictStyle} I=${p.sigIndependence} SB=${p.sigSocialBattery}`);
      console.log(`  Normalized signals: ${p.signals.map((s) => `${s.signalKey}=${s.signalValue}`).join(' ')}`);
      console.log('');
    }

    const totalAnalyzed = await prisma.userProfile.count({ where: { status: 'ANALYZED' } });
    const withSignals = await prisma.userProfileSignal.groupBy({
      by: ['profileId'],
    });
    const withDenorm = await prisma.userProfile.count({
      where: { status: 'ANALYZED', sigEmotionalDepth: { not: null } },
    });

    console.log('=== COUNTS ===');
    console.log(`Total ANALYZED: ${totalAnalyzed}`);
    console.log(`Profiles with signals (normalized): ${withSignals.length}`);
    console.log(`Profiles with denorm signals: ${withDenorm}`);
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
