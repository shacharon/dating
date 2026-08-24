import type { Socket } from 'socket.io';

/** Socket.IO handshake shape (public package exports do not re-export Handshake). */
export type Handshake = Socket['handshake'];

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
