import { ErrorCodes } from '../logging/error-codes';
import { PushNotificationQueueService } from './push-notification.worker';
import type { PushDispatchService } from '../notifications/push-dispatch.service';
import type { EmailRecipientHelper } from '../notifications/email-recipient.helper';
import type { MessagingSocketRegistry } from '../messaging-realtime/messaging-socket-registry.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';

describe('PushNotificationQueueService', () => {
  const pushDispatch = {
    sendToUser: jest.fn().mockResolvedValue(undefined),
  } as unknown as PushDispatchService;

  const recipients = {
    loadUserWithLabel: jest.fn(),
  } as unknown as EmailRecipientHelper;

  const socketRegistry = {
    hasActiveConnection: jest.fn().mockResolvedValue(false),
  } as unknown as MessagingSocketRegistry;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  let service: PushNotificationQueueService;
  const prevRedis = process.env.REDIS_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    (socketRegistry.hasActiveConnection as jest.Mock).mockResolvedValue(false);
    (pushDispatch.sendToUser as jest.Mock).mockResolvedValue(undefined);
    delete process.env.REDIS_URL;
    service = new PushNotificationQueueService(
      pushDispatch,
      recipients,
      socketRegistry,
      obs,
    );
  });

  afterAll(() => {
    if (prevRedis === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = prevRedis;
    }
  });

  it('isBullEnabled is false without REDIS_URL', async () => {
    await service.onModuleInit();
    expect(service.isBullEnabled()).toBe(false);
  });

  it('inline enqueue invokes runJob (fire-and-forget)', async () => {
    await service.onModuleInit();
    const runJob = jest
      .spyOn(
        service as unknown as { runJob: (d: unknown) => Promise<void> },
        'runJob',
      )
      .mockResolvedValue(undefined);

    const id = await service.enqueueNewMessageBestEffort({
      recipientUserId: 'r1',
      senderUserId: 's1',
      conversationId: 'c1',
      messagePreview: 'Hi',
    });

    expect(id.startsWith('inline:')).toBe(true);
    expect(runJob).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'new_message',
        recipientUserId: 'r1',
        messagePreview: 'Hi',
      }),
    );
  });

  it('new-message skips when recipient online', async () => {
    (socketRegistry.hasActiveConnection as jest.Mock).mockResolvedValue(true);

    await (
      service as unknown as {
        handleNewMessage: (d: {
          kind: 'new_message';
          recipientUserId: string;
          senderUserId: string;
          conversationId: string;
          messagePreview: string;
        }) => Promise<void>;
      }
    ).handleNewMessage({
      kind: 'new_message',
      recipientUserId: 'r1',
      senderUserId: 's1',
      conversationId: 'c1',
      messagePreview: 'Hi',
    });

    expect(pushDispatch.sendToUser).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('recipient online'),
      ErrorCodes.PUSH_SKIPPED_RECIPIENT_ONLINE,
    );
  });

  it('new-message dispatches with label', async () => {
    (recipients.loadUserWithLabel as jest.Mock).mockResolvedValue({
      displayName: 'Sam',
      profile: { nickname: null },
    });

    await (
      service as unknown as {
        handleNewMessage: (d: {
          kind: 'new_message';
          recipientUserId: string;
          senderUserId: string;
          conversationId: string;
          messagePreview: string;
        }) => Promise<void>;
      }
    ).handleNewMessage({
      kind: 'new_message',
      recipientUserId: 'r1',
      senderUserId: 's1',
      conversationId: 'c1',
      messagePreview: 'Hello there',
    });

    expect(pushDispatch.sendToUser).toHaveBeenCalledWith('r1', {
      title: 'New message from Sam',
      body: 'Hello there',
      data: { type: 'new_message', conversationId: 'c1' },
    });
  });

  it('mutual-match enqueues two dispatches', async () => {
    await service.onModuleInit();
    const runJob = jest
      .spyOn(
        service as unknown as { runJob: (d: unknown) => Promise<void> },
        'runJob',
      )
      .mockResolvedValue(undefined);

    await service.enqueueMutualMatchBestEffort({
      match: { id: 'm1', userId1: 'u1', userId2: 'u2' },
    });

    expect(runJob).toHaveBeenCalledTimes(2);
    expect(runJob).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'mutual_match',
        userId: 'u1',
        otherUserId: 'u2',
        conversationId: 'm1',
      }),
    );
    expect(runJob).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'mutual_match',
        userId: 'u2',
        otherUserId: 'u1',
      }),
    );
  });

  it('mutual-match handler builds payload', async () => {
    (recipients.loadUserWithLabel as jest.Mock).mockResolvedValue({
      displayName: 'Bob',
      profile: { nickname: null },
    });

    await (
      service as unknown as {
        handleMutualMatch: (d: {
          kind: 'mutual_match';
          userId: string;
          otherUserId: string;
          conversationId: string;
        }) => Promise<void>;
      }
    ).handleMutualMatch({
      kind: 'mutual_match',
      userId: 'u1',
      otherUserId: 'u2',
      conversationId: 'm1',
    });

    expect(pushDispatch.sendToUser).toHaveBeenCalledWith('u1', {
      title: 'New Match!',
      body: 'You matched with Bob',
      data: { type: 'mutual_match', conversationId: 'm1' },
    });
  });
});
