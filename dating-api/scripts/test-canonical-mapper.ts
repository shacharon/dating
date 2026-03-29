/**
 * Test canonical array projection with sample data.
 * Inserts a test row, reads it back, verifies normalization rules.
 */

import { PrismaClient } from '@prisma/client';
import type { ExtractionV2Result } from '../src/extraction/extraction-v2.service';
import { projectToCanonicalArrays } from '../src/canonical/canonical-projection';

const prisma = new PrismaClient();

const sampleExtraction: ExtractionV2Result = {
  version: 'v2',
  extractedAt: new Date().toISOString(),
  base: {
    self: {
      domain: 'self',
      signals: {
        ambition: 7,
        socialBattery: 8,
        emotionalDepth: 6,
      },
      evidence: [],
      version: 'v1',
      confidence: 0.75,
    },
    partner: {
      domain: 'partner',
      signals: {
        ambition: 5,
        relationshipClarity: 9,
      },
      evidence: [],
      version: 'v1',
      confidence: 0.6,
    },
    relationship: {
      domain: 'relationship',
      signals: {
        relationshipClarity: 8,
      },
      evidence: [],
      version: 'v1',
      confidence: 0.8,
    },
  },
  interests: {
    self: [
      { tag: 'HIKING', strength: 'explicit', evidence: 'I love hiking', ruleId: 'llm_v1' },
      { tag: 'hiking', strength: 'strong', evidence: 'hike every weekend', ruleId: 'llm_v1' },
      { tag: 'cooking', strength: 'explicit', evidence: 'I cook daily', ruleId: 'llm_v1' },
      { tag: 'YOGA', strength: 'strong', evidence: 'yoga class', ruleId: 'llm_v1' },
      { tag: 'unknown_tag', strength: 'explicit', evidence: 'test', ruleId: 'llm_v1' },
    ],
    partner: [
      { tag: 'gym', strength: 'explicit', evidence: 'wants gym partner', ruleId: 'llm_v1' },
      { tag: 'GYM', strength: 'strong', evidence: 'duplicate test', ruleId: 'llm_v1' },
    ],
    relationship: [
      { tag: 'travel', strength: 'explicit', evidence: 'should be ignored', ruleId: 'llm_v1' },
    ],
  },
  negatives: {
    self: [
      { category: 'behavioral', tag: 'SMOKING', strength: 'hard', evidence: 'no smokers', confidence: 0.95 },
      { category: 'social', tag: 'drama', strength: 'soft', evidence: 'avoid drama', confidence: 0.25 },
      { category: 'lifestyle', tag: 'pets  ', strength: 'soft', evidence: 'no pets', confidence: 0.7 },
      { category: 'behavioral', tag: 'smoking', strength: 'hard', evidence: 'duplicate', confidence: 0.9 },
    ],
    partner: [
      { category: 'lifestyle', tag: 'NO_KIDS', strength: 'hard', evidence: 'must want kids', confidence: 0.9 },
      { category: 'social', tag: 'clingy', strength: 'soft', evidence: 'not clingy', confidence: 0.8 },
    ],
    relationship: [
      { category: 'values', tag: 'politics', strength: 'hard', evidence: 'should be ignored', confidence: 0.85 },
    ],
  },
  _usage: {
    promptTokens: 1000,
    completionTokens: 2000,
    totalTokens: 3000,
    estimatedCostUSD: 0.01,
    durationMs: 5000,
  },
  _provenance: {
    extractorVersion: 'v2_test',
    promptHashes: {
      base: 'hash1',
      interests: 'hash2',
      negatives: 'hash3',
    },
  },
};

async function testCanonicalMapper() {
  console.log('=== Testing Canonical Array Projection ===\n');

  const testProfileId = 'canonical-test-001';

  // Step 1: Project to canonical arrays
  console.log('1. Projecting extraction to canonical arrays...\n');
  const canonical = projectToCanonicalArrays(sampleExtraction);

  console.log('Projected arrays:');
  console.log('  interests_self:', canonical.interests_self);
  console.log('  interests_partner:', canonical.interests_partner);
  console.log('  negatives_self:', canonical.negatives_self);
  console.log('  negatives_partner:', canonical.negatives_partner);
  console.log('  soft_no:', canonical.soft_no);
  console.log('  hard_no:', canonical.hard_no);

  // Step 2: Write to database
  console.log('\n2. Writing to database...\n');

  const textHash = 'test_hash_001';
  const coverageScore = 14;
  const avgConfidence = 0.717;

  // Ensure parent profile exists
  await prisma.userProfile.upsert({
    where: { id: testProfileId },
    create: {
      id: testProfileId,
      name: 'Test User',
      aboutMe: 'Test about me',
      aboutPartner: 'Test about partner',
      aboutRelationship: 'Test about relationship',
    },
    update: {},
  });

  await prisma.profileExtractionV2.upsert({
    where: { profileId: testProfileId },
    create: {
      profileId: testProfileId,
      promptVersion: 'v2_test',
      textHash,
      extractionJson: sampleExtraction as any,
      selfSignals: sampleExtraction.base.self.signals as any,
      partnerSignals: sampleExtraction.base.partner.signals as any,
      relationshipSignals: sampleExtraction.base.relationship.signals as any,
      coverageScore,
      avgConfidence,
      interests_self: canonical.interests_self,
      interests_partner: canonical.interests_partner,
      negatives_self: canonical.negatives_self,
      negatives_partner: canonical.negatives_partner,
      soft_no: canonical.soft_no,
      hard_no: canonical.hard_no,
    },
    update: {
      interests_self: canonical.interests_self,
      interests_partner: canonical.interests_partner,
      negatives_self: canonical.negatives_self,
      negatives_partner: canonical.negatives_partner,
      soft_no: canonical.soft_no,
      hard_no: canonical.hard_no,
      updatedAt: new Date(),
    },
  });

  console.log(`✓ Wrote profile ${testProfileId}`);

  // Step 3: Read back from database
  console.log('\n3. Reading back from database...\n');

  const stored = await prisma.profileExtractionV2.findUnique({
    where: { profileId: testProfileId },
    select: {
      profileId: true,
      interests_self: true,
      interests_partner: true,
      negatives_self: true,
      negatives_partner: true,
      soft_no: true,
      hard_no: true,
    },
  });

  if (!stored) {
    console.error('❌ Failed to read back stored row');
    process.exit(1);
  }

  console.log('Stored arrays:');
  console.table(stored);

  // Step 4: Verify normalization rules
  console.log('\n4. Verification Checks:\n');

  const checks = [
    {
      rule: 'Interests deduplicated',
      expected: ['cooking', 'hiking', 'yoga'],
      actual: stored.interests_self,
      pass: JSON.stringify(stored.interests_self) === JSON.stringify(['cooking', 'hiking', 'yoga']),
    },
    {
      rule: 'Interests lowercase',
      expected: 'all lowercase',
      actual: stored.interests_self.every(t => t === t.toLowerCase()),
      pass: stored.interests_self.every(t => t === t.toLowerCase()),
    },
    {
      rule: 'Interests sorted',
      expected: 'alphabetically sorted',
      actual: stored.interests_self.join(','),
      pass: stored.interests_self.join(',') === 'cooking,hiking,yoga',
    },
    {
      rule: 'Partner interests deduped',
      expected: ['gym'],
      actual: stored.interests_partner,
      pass: JSON.stringify(stored.interests_partner) === JSON.stringify(['gym']),
    },
    {
      rule: 'Negatives confidence filtered',
      expected: 'drama (0.25) dropped',
      actual: !stored.negatives_self.includes('drama'),
      pass: !stored.negatives_self.includes('drama'),
    },
    {
      rule: 'Negatives lowercase + trimmed',
      expected: ['pets', 'smoking'],
      actual: stored.negatives_self,
      pass: JSON.stringify(stored.negatives_self) === JSON.stringify(['pets', 'smoking']),
    },
    {
      rule: 'Negatives deduped',
      expected: 'only one smoking',
      actual: stored.negatives_self.filter(t => t === 'smoking').length,
      pass: stored.negatives_self.filter(t => t === 'smoking').length === 1,
    },
    {
      rule: 'Partner negatives normalized',
      expected: ['clingy', 'no_kids'],
      actual: stored.negatives_partner,
      pass: JSON.stringify(stored.negatives_partner) === JSON.stringify(['clingy', 'no_kids']),
    },
    {
      rule: 'Soft negatives extracted',
      expected: ['clingy', 'pets'],
      actual: stored.soft_no,
      pass: JSON.stringify(stored.soft_no) === JSON.stringify(['clingy', 'pets']),
    },
    {
      rule: 'Hard negatives extracted',
      expected: ['no_kids', 'smoking'],
      actual: stored.hard_no,
      pass: JSON.stringify(stored.hard_no) === JSON.stringify(['no_kids', 'smoking']),
    },
  ];

  console.table(checks);

  const allPassed = checks.every(c => c.pass);
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✓ ALL CHECKS PASSED');
  } else {
    console.log('❌ SOME CHECKS FAILED');
  }
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();

  process.exit(allPassed ? 0 : 1);
}

testCanonicalMapper().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
