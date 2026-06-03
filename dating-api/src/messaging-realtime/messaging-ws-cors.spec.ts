import { messagingWsCors } from './messaging-ws-cors';

describe('messagingWsCors', () => {
  const original = process.env.CORS_ORIGIN;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = original;
    }
  });

  it('allows configured origin', async () => {
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    const allow = await corsAllows('http://localhost:3000');
    expect(allow).toBe(true);
  });

  it('rejects disallowed origin', async () => {
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    const allow = await corsAllows('https://evil.example');
    expect(allow).toBe(false);
  });
});

function corsAllows(origin: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    messagingWsCors.origin(origin, (err, allow) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(allow === true);
    });
  });
}
