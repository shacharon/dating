import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';
import { userRoom } from './messaging-realtime.constants';

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
}
