import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 61 Story 3 — product services inject moderation ports; AWS Rekognition
 * construction lives only in PhotoStorageModule factory.
 */
describe('moderation ports wiring (sprint-61 story 3)', () => {
  const srcRoot = path.join(__dirname, '..');

  const textConsumers = [
    path.join(
      'me-profile',
      'conversations',
      'me-conversation-message-send.service.ts',
    ),
    path.join('me-profile', 'profile', 'profile-moderation.service.ts'),
  ];

  it('text consumers inject CONTENT_MODERATION and not OpenAIModerationClient', () => {
    for (const rel of textConsumers) {
      const src = fs.readFileSync(path.join(srcRoot, rel), 'utf8');
      expect(src).toContain('CONTENT_MODERATION');
      expect(src).toContain('ContentModerationPort');
      expect(src).not.toMatch(/from ['"].*openai-moderation\.client['"]/);
      expect(src).not.toContain('OpenAIModerationClient');
    }
  });

  it('PhotoModerationDecisionService injects REKOGNITION and never constructs RekognitionClient', () => {
    const src = fs.readFileSync(
      path.join(
        srcRoot,
        'photo-storage',
        'photo-moderation-decision.service.ts',
      ),
      'utf8',
    );
    expect(src).toContain('REKOGNITION');
    expect(src).toContain('@Inject(REKOGNITION)');
    expect(src).not.toMatch(/\bnew RekognitionClient\b/);
    expect(src).not.toMatch(/from ['"]@aws-sdk\/client-rekognition['"]/);
  });

  it('new RekognitionClient appears only in photo-storage.module.ts under src', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        if (name === 'node_modules' || name.endsWith('.spec.ts')) continue;
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) {
          walk(full);
          continue;
        }
        if (!name.endsWith('.ts')) continue;
        const text = fs.readFileSync(full, 'utf8');
        if (/\bnew RekognitionClient\b/.test(text)) {
          hits.push(path.relative(srcRoot, full).replace(/\\/g, '/'));
        }
      }
    };
    walk(srcRoot);
    expect(hits).toEqual(['photo-storage/photo-storage.module.ts']);
  });

  it('ContentModerationModule exports CONTENT_MODERATION via useExisting', () => {
    const src = fs.readFileSync(
      path.join(srcRoot, 'content-moderation', 'content-moderation.module.ts'),
      'utf8',
    );
    expect(src).toContain('CONTENT_MODERATION');
    expect(src).toContain('useExisting: OpenAIModerationClient');
  });
});
