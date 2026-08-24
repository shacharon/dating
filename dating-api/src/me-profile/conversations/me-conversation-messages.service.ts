import { Injectable } from '@nestjs/common';
import {
  type MessageDto,
  type MessageListDto,
} from './me-conversation-messages.dto';
import { MeConversationMessageListService } from './me-conversation-message-list.service';
import { MeConversationMessageSendService } from './me-conversation-message-send.service';

@Injectable()
export class MeConversationMessagesService {
  constructor(
    private readonly listService: MeConversationMessageListService,
    private readonly sendService: MeConversationMessageSendService,
  ) {}

  listMessages(
    sessionUserId: string,
    conversationId: string,
    options: { limit: number; before?: string; after?: string },
  ): Promise<MessageListDto> {
    return this.listService.listMessages(
      sessionUserId,
      conversationId,
      options,
    );
  }

  sendMessage(
    sessionUserId: string,
    conversationId: string,
    input: { text: string; clientMessageId?: string },
  ): Promise<MessageDto> {
    return this.sendService.sendMessage(
      sessionUserId,
      conversationId,
      input,
    );
  }
}
