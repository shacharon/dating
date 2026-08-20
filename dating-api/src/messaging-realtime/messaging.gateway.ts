import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { SentryBridgeService } from '../observability/sentry-bridge.service';
import { MeConversationsService } from '../me-profile/me-conversations.service';
import {
  MESSAGING_EVENT_CONVERSATION_SUBSCRIBE,
  MESSAGING_EVENT_CONVERSATION_UNSUBSCRIBE,
  MESSAGING_EVENT_SUBSCRIBE_DENIED,
  MESSAGING_EVENT_SUBSCRIBE_OK,
  MESSAGING_WS_NAMESPACE,
  userRoom,
} from './messaging-realtime.constants';
import { WS_SESSION_REVALIDATE_MS } from './messaging-ws-inbound.constants';
import { messagingWsCors } from './messaging-ws-cors';
import {
  MessagingWsAuthService,
  type MessagingSocketData,
} from './messaging-ws-auth.service';
import { MessagingSocketRegistry } from './messaging-socket-registry.service';
import { MessagingWsRateLimitService } from './messaging-ws-rate-limit.service';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import { MessagingWsSessionService } from './messaging-ws-session.service';
import { RealtimePublisher } from './realtime-publisher.service';

function getSubscribedIds(client: Socket): Set<string> {
  const data = client.data as MessagingSocketData;
  if (!data.subscribedConversationIds) {
    data.subscribedConversationIds = new Set();
  }
  return data.subscribedConversationIds;
}

function clearSessionCheckTimer(client: Socket): void {
  const data = client.data as MessagingSocketData;
  if (data.sessionCheckTimer) {
    clearInterval(data.sessionCheckTimer);
    data.sessionCheckTimer = undefined;
  }
}

@WebSocketGateway({
  namespace: MESSAGING_WS_NAMESPACE,
  cors: messagingWsCors,
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Namespace;

  constructor(
    private readonly wsAuth: MessagingWsAuthService,
    private readonly publisher: RealtimePublisher,
    private readonly obs: StructuredObservabilityService,
    private readonly sentry: SentryBridgeService,
    private readonly conversations: MeConversationsService,
    private readonly rateLimit: MessagingWsRateLimitService,
    private readonly wsSession: MessagingWsSessionService,
    private readonly socketRegistry: MessagingSocketRegistry,
    private readonly analytics: AnalyticsService,
  ) {}

  afterInit(): void {
    this.publisher.bindNamespaceServer(this.server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const result = await this.wsAuth.validateHandshake(
      client.handshake.headers.cookie,
    );

    if (!result.ok) {
      this.obs.trace(
        `messaging ws auth failed reason=${result.reason} socketId=${client.id}`,
        ErrorCodes.MESSAGING_WS_AUTH_FAILED,
      );
      client.disconnect(true);
      return;
    }

    const data: MessagingSocketData = {
      userId: result.userId,
      sessionId: result.sessionId,
      subscribedConversationIds: new Set(),
    };
    client.data = data;
    await client.join(userRoom(result.userId));
    await this.socketRegistry.registerAsync(client);
    this.startSessionRevalidation(client);

    this.obs.trace(
      `messaging ws connect userId=${result.userId} sessionId=${result.sessionId} socketId=${client.id} active=${this.socketRegistry.activeConnectionCount()}`,
      ErrorCodes.MESSAGING_WS_CONNECT_OK,
    );
    this.analytics.track(
      result.userId,
      ProductAnalyticsEvents.MESSAGING_WS_CONNECTED,
      {
        activeConnections: this.socketRegistry.activeConnectionCount(),
      },
    );
  }

  async handleDisconnect(client: Socket): Promise<void> {
    clearSessionCheckTimer(client);
    await this.socketRegistry.unregisterAsync(client);

    const data = client.data as MessagingSocketData | undefined;
    const userId = data?.userId ?? 'unknown';
    const sessionId = data?.sessionId ?? 'unknown';

    this.obs.trace(
      `messaging ws disconnect userId=${userId} sessionId=${sessionId} socketId=${client.id} active=${this.socketRegistry.activeConnectionCount()}`,
      ErrorCodes.MESSAGING_WS_DISCONNECT_OK,
    );
    if (data?.userId) {
      this.analytics.track(
        data.userId,
        ProductAnalyticsEvents.MESSAGING_WS_DISCONNECTED,
        {
          activeConnections: this.socketRegistry.activeConnectionCount(),
        },
      );
    }
  }

  @SubscribeMessage(MESSAGING_EVENT_CONVERSATION_SUBSCRIBE)
  async onSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId?: string },
  ): Promise<void> {
    if (!(await this.guardInbound(client))) {
      return;
    }

    const data = client.data as MessagingSocketData;
    const conversationId = payload?.conversationId?.trim();
    if (!conversationId) {
      client.emit(MESSAGING_EVENT_SUBSCRIBE_DENIED, {
        conversationId: '',
        reason: 'invalid',
      });
      return;
    }

    try {
      await this.conversations.assertActiveConversationParticipant(
        data.userId,
        conversationId,
      );
    } catch {
      this.obs.trace(
        `messaging ws subscribe denied userId=${data.userId} conversationId=${conversationId}`,
        ErrorCodes.MESSAGING_WS_SUBSCRIBE_DENIED,
      );
      client.emit(MESSAGING_EVENT_SUBSCRIBE_DENIED, {
        conversationId,
        reason: 'forbidden',
      });
      return;
    }

    getSubscribedIds(client).add(conversationId);
    this.obs.trace(
      `messaging ws subscribe ok userId=${data.userId} conversationId=${conversationId}`,
      ErrorCodes.MESSAGING_WS_SUBSCRIBE_OK,
    );
    client.emit(MESSAGING_EVENT_SUBSCRIBE_OK, { conversationId });
  }

  @SubscribeMessage(MESSAGING_EVENT_CONVERSATION_UNSUBSCRIBE)
  async onUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId?: string },
  ): Promise<void> {
    if (!(await this.guardInbound(client))) {
      return;
    }

    const conversationId = payload?.conversationId?.trim();
    if (!conversationId) {
      return;
    }

    getSubscribedIds(client).delete(conversationId);
  }

  private async guardInbound(client: Socket): Promise<boolean> {
    const data = client.data as MessagingSocketData | undefined;
    if (!data?.userId) {
      client.disconnect(true);
      return false;
    }

    try {
      await this.rateLimit.consumeInboundSlot(data.userId);
      return true;
    } catch (e) {
      if (e instanceof WsRateLimitExceededError) {
        this.obs.trace(
          `messaging ws rate limited userId=${data.userId} socketId=${client.id}`,
          ErrorCodes.MESSAGING_WS_RATE_LIMITED,
        );
        this.sentry.captureMessage(
          `messaging ws rate limited userId=${data.userId}`,
          {
            errorCode: ErrorCodes.MESSAGING_WS_RATE_LIMITED,
            tags: { subsystem: 'messaging-realtime' },
            level: 'warning',
          },
        );
        client.disconnect(true);
        return false;
      }
      throw e;
    }
  }

  private startSessionRevalidation(client: Socket): void {
    const data = client.data as MessagingSocketData;

    const timer = setInterval(() => {
      void (async () => {
        const active = await this.wsSession.isSessionActive(data.sessionId);
        if (!active) {
          this.obs.trace(
            `messaging ws session invalid userId=${data.userId} sessionId=${data.sessionId} socketId=${client.id}`,
            ErrorCodes.MESSAGING_WS_SESSION_INVALIDATED,
          );
          this.sentry.captureMessage(
            `messaging ws session invalid userId=${data.userId}`,
            {
              errorCode: ErrorCodes.MESSAGING_WS_SESSION_INVALIDATED,
              tags: { subsystem: 'messaging-realtime' },
              level: 'warning',
            },
          );
          clearSessionCheckTimer(client);
          client.disconnect(true);
          return;
        }
        await this.socketRegistry.refreshPresence(client);
      })();
    }, WS_SESSION_REVALIDATE_MS);

    data.sessionCheckTimer = timer;
  }
}
