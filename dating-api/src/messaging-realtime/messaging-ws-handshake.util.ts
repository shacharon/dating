import type { Handshake } from 'socket.io/dist/socket-types';

/** Read JWT access token from Socket.IO handshake (auth object preferred over query). */
export function readHandshakeAccessToken(handshake: Handshake): string | null {
  const authToken = handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }
  const q = handshake.query?.token;
  if (typeof q === 'string' && q.trim()) {
    return q.trim();
  }
  if (Array.isArray(q) && typeof q[0] === 'string' && q[0].trim()) {
    return q[0].trim();
  }
  return null;
}
