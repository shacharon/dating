import { Injectable } from '@nestjs/common';
import type { Socket } from 'socket.io';
import type { MessagingSocketData } from './messaging-ws-auth.service';

@Injectable()
export class MessagingSocketRegistry {
  private readonly bySession = new Map<string, Set<Socket>>();
  private readonly byUserId = new Map<string, Set<Socket>>();

  register(client: Socket): void {
    const data = client.data as MessagingSocketData | undefined;
    if (!data?.sessionId) {
      return;
    }

    let sessionSet = this.bySession.get(data.sessionId);
    if (!sessionSet) {
      sessionSet = new Set();
      this.bySession.set(data.sessionId, sessionSet);
    }
    sessionSet.add(client);

    if (data.userId) {
      let userSet = this.byUserId.get(data.userId);
      if (!userSet) {
        userSet = new Set();
        this.byUserId.set(data.userId, userSet);
      }
      userSet.add(client);
    }
  }

  unregister(client: Socket): void {
    const data = client.data as MessagingSocketData | undefined;
    if (!data?.sessionId) {
      return;
    }

    const sessionSet = this.bySession.get(data.sessionId);
    if (sessionSet) {
      sessionSet.delete(client);
      if (sessionSet.size === 0) {
        this.bySession.delete(data.sessionId);
      }
    }

    if (data.userId) {
      this.removeFromUserMap(data.userId, client);
    }
  }

  disconnectByUserId(userId: string): void {
    const set = this.byUserId.get(userId);
    if (!set) {
      return;
    }
    for (const socket of [...set]) {
      const data = socket.data as MessagingSocketData | undefined;
      if (data?.sessionId) {
        const sessionSet = this.bySession.get(data.sessionId);
        if (sessionSet) {
          sessionSet.delete(socket);
          if (sessionSet.size === 0) {
            this.bySession.delete(data.sessionId);
          }
        }
      }
      socket.disconnect(true);
    }
    this.byUserId.delete(userId);
  }

  disconnectBySessionId(sessionId: string): void {
    const set = this.bySession.get(sessionId);
    if (!set) {
      return;
    }
    for (const socket of [...set]) {
      const data = socket.data as MessagingSocketData | undefined;
      if (data?.userId) {
        this.removeFromUserMap(data.userId, socket);
      }
      socket.disconnect(true);
    }
    this.bySession.delete(sessionId);
  }

  hasActiveConnection(userId: string): boolean {
    const set = this.byUserId.get(userId);
    return !!set && set.size > 0;
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
    this.byUserId.clear();
  }

  private removeFromUserMap(userId: string, client: Socket): void {
    const userSet = this.byUserId.get(userId);
    if (!userSet) {
      return;
    }
    userSet.delete(client);
    if (userSet.size === 0) {
      this.byUserId.delete(userId);
    }
  }
}
