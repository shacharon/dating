import { ForbiddenException } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import {
  MESSAGING_EVENT_SUBSCRIBE_DENIED,
  MESSAGING_EVENT_SUBSCRIBE_OK,
  MESSAGING_WS_NAMESPACE,
  userRoom,
} from './messaging-realtime.constants';
import { WS_SESSION_REVALIDATE_MS } from './messaging-ws-inbound.constants';
import { MessagingGateway } from './messaging.gateway';
import type { MessagingWsAuthService } from './messaging-ws-auth.service';
import type { MeConversationsService } from '../me-profile/me-conversations.service';
import type { MessagingSocketRegistry } from './messaging-socket-registry.service';
import type { MessagingWsRateLimitService } from './messaging-ws-rate-limit.service';
import type { MessagingWsSessionService } from './messaging-ws-session.service';
import type { RealtimePublisher } from './realtime-publisher.service';
import type { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { SentryBridgeService } from '../observability/sentry-bridge.service';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import type { Namespace, Socket } from 'socket.io';

function mockSocket(cookie?: string): Socket {
  return {
    id: 'socket_test_1',
    handshake: {
      headers: { cookie },
    },
    data: {},
    join: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    emit: jest.fn(),
  } as unknown as Socket;
}

describe('MessagingGateway', () => {
  const wsAuth = {
    validateHandshake: jest.fn(),
  } as unknown as MessagingWsAuthService;

  const publisher = {
    bindNamespaceServer: jest.fn(),
  } as unknown as RealtimePublisher;

  const obs = {
    trace: jest.fn(),
  } as unknown as StructuredObservabilityService;

  const sentry = {
    captureMessage: jest.fn(),
    captureException: jest.fn(),
  } as unknown as SentryBridgeService;

  const conversations = {
    assertActiveConversationParticipant: jest.fn(),
  } as unknown as MeConversationsService;

  const rateLimit = {
    consumeInboundSlot: jest.fn().mockResolvedValue(undefined),
  } as unknown as MessagingWsRateLimitService;

  const wsSession = {
    isSessionActive: jest.fn().mockResolvedValue(true),
  } as unknown as MessagingWsSessionService;

  const socketRegistry = {
    register: jest.fn(),
    registerAsync: jest.fn().mockResolvedValue(undefined),
    unregister: jest.fn(),
    unregisterAsync: jest.fn().mockResolvedValue(undefined),
    refreshPresence: jest.fn().mockResolvedValue(undefined),
    activeConnectionCount: jest.fn().mockReturnValue(1),
    disconnectBySessionId: jest.fn(),
  } as unknown as MessagingSocketRegistry;

  const analytics = {
    track: jest.fn(),
  } as unknown as AnalyticsService;

  let gateway: MessagingGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    gateway = new MessagingGateway(
      wsAuth,
      publisher,
      obs,
      sentry,
      conversations,
      rateLimit,
      wsSession,
      socketRegistry,
      analytics,
    );
    gateway.server = {} as Namespace;
  });

  it('binds namespace server to RealtimePublisher on afterInit', () => {
    const ns = { name: MESSAGING_WS_NAMESPACE } as Namespace;
    gateway.server = ns;

    gateway.afterInit();

    expect(publisher.bindNamespaceServer).toHaveBeenCalledWith(ns);
  });

  it('joins user room, registers socket, and logs connect on valid handshake', async () => {
    (wsAuth.validateHandshake as jest.Mock).mockResolvedValue({
      ok: true,
      userId: 'user_a',
      sessionId: 'sess_a',
    });
    const client = mockSocket('dating_session=token');

    await gateway.handleConnection(client);

    expect(client.join).toHaveBeenCalledWith(userRoom('user_a'));
    expect(socketRegistry.registerAsync).toHaveBeenCalledWith(client);
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('user_a'),
      ErrorCodes.MESSAGING_WS_CONNECT_OK,
    );
    expect(analytics.track).toHaveBeenCalledWith(
      'user_a',
      ProductAnalyticsEvents.MESSAGING_WS_CONNECTED,
      { activeConnections: 1 },
    );
  });

  it('disconnects and logs auth failure on invalid handshake', async () => {
    (wsAuth.validateHandshake as jest.Mock).mockResolvedValue({
      ok: false,
      reason: 'invalid_session',
    });
    const client = mockSocket();

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('invalid_session'),
      ErrorCodes.MESSAGING_WS_AUTH_FAILED,
    );
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('emits subscribe.ok for active participant', async () => {
    (conversations.assertActiveConversationParticipant as jest.Mock).mockResolvedValue(
      { id: 'conv_1' },
    );
    const client = mockSocket();
    client.data = { userId: 'user_a', sessionId: 'sess_a' };

    await gateway.onSubscribe(client, { conversationId: 'conv_1' });

    expect(client.emit).toHaveBeenCalledWith(MESSAGING_EVENT_SUBSCRIBE_OK, {
      conversationId: 'conv_1',
    });
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('conv_1'),
      ErrorCodes.MESSAGING_WS_SUBSCRIBE_OK,
    );
  });

  it('emits subscribe.denied for non-participant', async () => {
    (conversations.assertActiveConversationParticipant as jest.Mock).mockRejectedValue(
      new ForbiddenException(),
    );
    const client = mockSocket();
    client.data = { userId: 'user_a', sessionId: 'sess_a' };

    await gateway.onSubscribe(client, { conversationId: 'conv_other' });

    expect(client.emit).toHaveBeenCalledWith(MESSAGING_EVENT_SUBSCRIBE_DENIED, {
      conversationId: 'conv_other',
      reason: 'forbidden',
    });
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('conv_other'),
      ErrorCodes.MESSAGING_WS_SUBSCRIBE_DENIED,
    );
  });

  it('emits subscribe.denied for invalid payload', async () => {
    const client = mockSocket();
    client.data = { userId: 'user_a', sessionId: 'sess_a' };

    await gateway.onSubscribe(client, { conversationId: '  ' });

    expect(client.emit).toHaveBeenCalledWith(MESSAGING_EVENT_SUBSCRIBE_DENIED, {
      conversationId: '',
      reason: 'invalid',
    });
    expect(conversations.assertActiveConversationParticipant).not.toHaveBeenCalled();
  });

  it('removes conversation id on unsubscribe', async () => {
    const client = mockSocket();
    client.data = {
      userId: 'user_a',
      sessionId: 'sess_a',
      subscribedConversationIds: new Set(['conv_1']),
    };

    await gateway.onUnsubscribe(client, { conversationId: 'conv_1' });

    expect((client.data as { subscribedConversationIds: Set<string> })
      .subscribedConversationIds.size).toBe(0);
    expect(rateLimit.consumeInboundSlot).toHaveBeenCalled();
  });

  it('disconnects when inbound rate limit exceeded', async () => {
    (rateLimit.consumeInboundSlot as jest.Mock).mockRejectedValue(
      new WsRateLimitExceededError(),
    );
    const client = mockSocket();
    client.data = { userId: 'user_a', sessionId: 'sess_a' };

    await gateway.onSubscribe(client, { conversationId: 'conv_1' });

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('rate limited'),
      ErrorCodes.MESSAGING_WS_RATE_LIMITED,
    );
  });

  it('refreshes presence TTL when session revalidate succeeds', async () => {
    jest.useFakeTimers();
    (wsAuth.validateHandshake as jest.Mock).mockResolvedValue({
      ok: true,
      userId: 'user_a',
      sessionId: 'sess_a',
    });
    (wsSession.isSessionActive as jest.Mock).mockResolvedValue(true);
    const client = mockSocket('dating_session=token');

    await gateway.handleConnection(client);
    (socketRegistry.refreshPresence as jest.Mock).mockClear();

    jest.advanceTimersByTime(WS_SESSION_REVALIDATE_MS);
    await Promise.resolve();
    await Promise.resolve();

    expect(socketRegistry.refreshPresence).toHaveBeenCalledWith(client);
    expect(client.disconnect).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('disconnects when periodic session check fails', async () => {
    jest.useFakeTimers();
    (wsAuth.validateHandshake as jest.Mock).mockResolvedValue({
      ok: true,
      userId: 'user_a',
      sessionId: 'sess_a',
    });
    (wsSession.isSessionActive as jest.Mock).mockResolvedValue(false);
    const client = mockSocket('dating_session=token');

    await gateway.handleConnection(client);

    jest.advanceTimersByTime(WS_SESSION_REVALIDATE_MS);
    await Promise.resolve();
    await Promise.resolve();

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('session invalid'),
      ErrorCodes.MESSAGING_WS_SESSION_INVALIDATED,
    );

    jest.useRealTimers();
  });

  it('unregisters socket on disconnect', async () => {
    const client = mockSocket();
    client.data = {
      userId: 'user_b',
      sessionId: 'sess_b',
      sessionCheckTimer: setInterval(() => {}, 60_000),
    };

    await gateway.handleDisconnect(client);

    expect(socketRegistry.unregisterAsync).toHaveBeenCalledWith(client);
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringMatching(/user_b.*sess_b/),
      ErrorCodes.MESSAGING_WS_DISCONNECT_OK,
    );
    expect(analytics.track).toHaveBeenCalledWith(
      'user_b',
      ProductAnalyticsEvents.MESSAGING_WS_DISCONNECTED,
      { activeConnections: 1 },
    );
  });
});
