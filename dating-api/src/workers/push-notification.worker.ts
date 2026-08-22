import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Queue from 'bull';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { MessagingSocketRegistry } from '../messaging-realtime/messaging-socket-registry.service';
import { displayLabel } from '../notifications/email-format.util';
import { EmailRecipientHelper } from '../notifications/email-recipient.helper';
import { PushDispatchService } from '../notifications/push-dispatch.service';
import {
  PUSH_NOTIFICATION_QUEUE,
  type PushMutualMatchJobData,
  type PushNewMessageJobData,
  type PushNotificationJobData,
  truncatePushPreview,
} from './push-notification.queue';
import type { PushNotificationQueuePort } from './push-notification.ports';

/**
 * Bull-backed push notification queue (Sprint 67 Story 1).
 * REDIS_URL unset / Bull init failure → inline degraded mode.
 */
@Injectable()
export class PushNotificationQueueService
  implements OnModuleInit, OnModuleDestroy, PushNotificationQueuePort
{
  private readonly logger = new Logger(PushNotificationQueueService.name);
  private queue: Queue.Queue<PushNotificationJobData> | null = null;
  private bullEnabled = false;

  constructor(
    private readonly pushDispatch: PushDispatchService,
    private readonly recipients: EmailRecipientHelper,
    private readonly socketRegistry: MessagingSocketRegistry,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.logger.warn(
        'REDIS_URL unset — push-notifications Bull queue disabled (inline degraded mode)',
      );
      return;
    }
    try {
      const queue = new Queue<PushNotificationJobData>(
        PUSH_NOTIFICATION_QUEUE,
        url,
        { defaultJobOptions: { attempts: 1, removeOnComplete: true } },
      );
      queue.process(async (job) => {
        await this.runJob(job.data);
      });
      this.queue = queue;
      this.bullEnabled = true;
      this.logger.log('push-notifications Bull queue ready');
    } catch (err) {
      this.logger.warn(
        `push-notifications Bull init failed — inline degraded mode: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
      this.bullEnabled = false;
    }
  }

  isBullEnabled(): boolean {
    return this.bullEnabled;
  }

  async enqueueNewMessageBestEffort(
    data: Omit<PushNewMessageJobData, 'kind'>,
  ): Promise<string> {
    const job: PushNewMessageJobData = {
      kind: 'new_message',
      recipientUserId: data.recipientUserId,
      senderUserId: data.senderUserId,
      conversationId: data.conversationId,
      messagePreview: truncatePushPreview(data.messagePreview),
    };
    return this.enqueueOrInline(job);
  }

  async enqueueMutualMatchBestEffort(data: {
    match: { id: string; userId1: string; userId2: string };
  }): Promise<void> {
    const { id, userId1, userId2 } = data.match;
    await Promise.all([
      this.enqueueOrInline({
        kind: 'mutual_match',
        userId: userId1,
        otherUserId: userId2,
        conversationId: id,
      }),
      this.enqueueOrInline({
        kind: 'mutual_match',
        userId: userId2,
        otherUserId: userId1,
        conversationId: id,
      }),
    ]);
  }

  private async enqueueOrInline(job: PushNotificationJobData): Promise<string> {
    if (this.queue && this.bullEnabled) {
      try {
        const added = await this.queue.add(job, { attempts: 1 });
        return String(added.id);
      } catch (err) {
        this.logger.warn(
          `push enqueue failed — inline fallback: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    const inlineId = `inline:${job.kind}:${Date.now()}`;
    void this.runJob(job).catch((e: unknown) => {
      this.logger.error(
        `inline push job failed kind=${job.kind}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    });
    return inlineId;
  }

  private async runJob(data: PushNotificationJobData): Promise<void> {
    if (data.kind === 'new_message') {
      await this.handleNewMessage(data);
      return;
    }
    await this.handleMutualMatch(data);
  }

  private async handleNewMessage(data: PushNewMessageJobData): Promise<void> {
    if (await this.socketRegistry.hasActiveConnection(data.recipientUserId)) {
      this.obs.trace(
        `push skipped recipient online userId=${data.recipientUserId} conversationId=${data.conversationId}`,
        ErrorCodes.PUSH_SKIPPED_RECIPIENT_ONLINE,
      );
      return;
    }
    const sender = await this.recipients.loadUserWithLabel(data.senderUserId);
    const label = displayLabel(
      sender?.profile?.nickname,
      sender?.displayName,
    );
    await this.pushDispatch.sendToUser(data.recipientUserId, {
      title: `New message from ${label}`,
      body: data.messagePreview,
      data: {
        type: 'new_message',
        conversationId: data.conversationId,
      },
    });
  }

  private async handleMutualMatch(data: PushMutualMatchJobData): Promise<void> {
    const other = await this.recipients.loadUserWithLabel(data.otherUserId);
    const label = displayLabel(other?.profile?.nickname, other?.displayName);
    await this.pushDispatch.sendToUser(data.userId, {
      title: 'New Match!',
      body: `You matched with ${label}`,
      data: {
        type: 'mutual_match',
        conversationId: data.conversationId,
      },
    });
  }
}
