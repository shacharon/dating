import { Injectable } from '@nestjs/common';
import type { Socket } from 'socket.io';
import type { MessagingSocketData } from './messaging-ws-auth.service';

@Injectable()
export class MessagingSocketRegistry {
  private readonly bySession = new Map<string, Set<Socket>>();

  register(client: Socket): void {
    const data = client.data as MessagingSocketData | undefined;
    if (!data?.sessionId) {
      return;
    }

    let set = this.bySession.get(data.sessionId);
    if (!set) {
      set = new Set();
      this.bySession.set(data.sessionId, set);
    }
    set.add(client);
  }

  unregister(client: Socket): void {
    const data = client.data as MessagingSocketData | undefined;
    if (!data?.sessionId) {
      return;
    }

    const set = this.bySession.get(data.sessionId);
    if (!set) {
      return;
    }
    set.delete(client);
    if (set.size === 0) {
      this.bySession.delete(data.sessionId);
    }
  }

  disconnectBySessionId(sessionId: string): void {
    const set = this.bySession.get(sessionId);
    if (!set) {
      return;
    }
    for (const socket of [...set]) {
      socket.disconnect(true);
    }
    this.bySession.delete(sessionId);
  }

  activeConnectionCount(): number {
    let total = 0;
    for (const set of this.bySession.values()) {
      total += set.size;
    }
    return total;
  }

  /** Test-only. */
  resetForTests(): void {
    this.bySession.clear();
  }
}
