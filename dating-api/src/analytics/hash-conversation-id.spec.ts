import { hashConversationId } from './hash-conversation-id';

describe('hashConversationId', () => {
  const prevSalt = process.env.PRODUCT_ANALYTICS_HASH_SALT;

  afterEach(() => {
    if (prevSalt === undefined) {
      delete process.env.PRODUCT_ANALYTICS_HASH_SALT;
    } else {
      process.env.PRODUCT_ANALYTICS_HASH_SALT = prevSalt;
    }
  });

  it('returns stable 16-char hex for same id without salt', () => {
    delete process.env.PRODUCT_ANALYTICS_HASH_SALT;
    const a = hashConversationId('conv_abc');
    const b = hashConversationId('conv_abc');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{16}$/);
  });

  it('differs when salt changes', () => {
    process.env.PRODUCT_ANALYTICS_HASH_SALT = 'salt_a';
    const withA = hashConversationId('conv_abc');
    process.env.PRODUCT_ANALYTICS_HASH_SALT = 'salt_b';
    const withB = hashConversationId('conv_abc');
    expect(withA).not.toBe(withB);
  });
});
