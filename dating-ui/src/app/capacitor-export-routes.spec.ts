/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { generateStaticParams as conversationParams } from '@/app/dating/conversations/[id]/page';
import { generateStaticParams as matchParams } from '@/app/dating/me-matches/[id]/page';
import { generateStaticParams as adminMatchQualityParams } from '@/app/admin/match-quality/[profileId]/page';

describe('Capacitor export dynamic route stubs', () => {
  it('exports placeholder conversation detail shell', () => {
    expect(conversationParams()).toEqual([{ id: '__export__' }]);
  });

  it('exports placeholder match detail shell', () => {
    expect(matchParams()).toEqual([{ id: '__export__' }]);
  });

  it('exports placeholder admin match-quality shell', () => {
    expect(adminMatchQualityParams()).toEqual([{ profileId: '__export__' }]);
  });
});
