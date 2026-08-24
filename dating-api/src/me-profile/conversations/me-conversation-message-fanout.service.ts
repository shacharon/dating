import { Inject, Injectable } from '@nestjs/common';
import { MESSAGING_EVENT_MESSAGE_NEW } from '../../messaging-realtime/messaging-realtime.constants';
import { RealtimePublisher } from '../../messaging-realtime/realtime-publisher.service';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { NewMessageEmailService } from '../../notifications/new-message-email.service';
import { type MessageDto } from './me-conversation-messages.dto';
import {
  PUSH_NOTIFICATION_QUEUE_PORT,
  type PushNotificationQueuePort,
} from '../../workers/push-notification.ports';
import { truncatePushPreview } from '../../workers/push-notification.queue';

@Injectable()
export class MeConversationMessageFanoutService {
  constructor(
    private readonly realtime: RealtimePublisher,
    private readonly newMessageEmail: NewMessageEmailService,
    private readonly obs: StructuredObservabilityService,
    @Inject(PUSH_NOTIFICATION_QUEUE_PORT)
    private readonly pushQueue: PushNotificationQueuePort,
  ) {}

  afterPersistBestEffort(params: {
    userId1: string;
    userId2: string;
    sessionUserId: string;
    conversationId: string;
    dto: MessageDto;
    trimmed: string;
  }): void {
    this.publishMessageNewBestEffort(
      params.userId1,
      params.userId2,
      params.dto,
      params.conversationId,
    );

    const recipientUserId =
      params.sessionUserId === params.userId1
        ? params.userId2
        : params.userId1;
    void this.newMessageEmail.maybeNotifyBestEffort({
      conversationId: params.conversationId,
      recipientUserId,
      senderUserId: params.sessionUserId,
      messageId: params.dto.id,
    });
    void this.pushQueue.enqueueNewMessageBestEffort({
      recipientUserId,
      senderUserId: params.sessionUserId,
      conversationId: params.conversationId,
      messagePreview: truncatePushPreview(params.trimmed),
    });
  }

  private publishMessageNewBestEffort(
    userId1: string,
    userId2: string,
    payload: MessageDto,
    conversationId: string,
  ): void {
    try {
      this.realtime.publishToUsers(
        [userId1, userId2],
        MESSAGING_EVENT_MESSAGE_NEW,
        payload,
      );
    } catch (err) {
      this.obs.error(
        `messaging message.new publish failed conversationId=${conversationId} messageId=${payload.id}`,
        ErrorCodes.MESSAGING_MESSAGE_NEW_PUBLISH_FAILED,
        err,
      );
    }
  }
}
