import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';
import { sessionRoom, userRoom } from './messaging-realtime.constants';

@Injectable()
export class RealtimePublisher {
  private namespaceServer: Namespace | null = null;

  bindNamespaceServer(server: Namespace): void {
    this.namespaceServer = server;
  }

  publishToUser(userId: string, event: string, payload: unknown): void {
    this.namespaceServer?.to(userRoom(userId)).emit(event, payload);
  }

  publishToUsers(userIds: string[], event: string, payload: unknown): void {
    for (const id of userIds) {
      this.publishToUser(id, event, payload);
    }
  }

  /** Cluster-wide logout: Redis adapter fans disconnect to all nodes in session room. */
  disconnectSessionSockets(sessionId: string): void {
    const id = sessionId.trim();
    if (!id) return;
    this.namespaceServer?.in(sessionRoom(id)).disconnectSockets(true);
  }

  /** Cluster-wide account delete / revoke-all. */
  disconnectUserSockets(userId: string): void {
    const id = userId.trim();
    if (!id) return;
    this.namespaceServer?.in(userRoom(id)).disconnectSockets(true);
  }
}
