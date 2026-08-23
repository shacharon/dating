import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { MAX_MESSAGE_TEXT_LENGTH } from './conversation-message.constants';

export class SendConversationMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Message text is required' })
  @MaxLength(MAX_MESSAGE_TEXT_LENGTH, {
    message: 'Message exceeds 2000 characters',
  })
  text!: string;

  @IsOptional()
  @IsUUID('4')
  clientMessageId?: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: 'SENT';
  clientMessageId: string | null;
}

export interface MessageListDto {
  messages: MessageDto[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

const DEFAULT_MESSAGE_LIST_LIMIT = 50;
const MAX_MESSAGE_LIST_LIMIT = 100;

export function parseMessageListLimit(limitStr?: string): number {
  if (limitStr === undefined || limitStr.trim() === '') {
    return DEFAULT_MESSAGE_LIST_LIMIT;
  }
  const parsed = Number.parseInt(limitStr, 10);
  if (
    !Number.isFinite(parsed) ||
    parsed < 1 ||
    parsed > MAX_MESSAGE_LIST_LIMIT
  ) {
    throw new BadRequestException('Invalid message list limit.');
  }
  return parsed;
}

export function toMessageDto(row: {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  clientMessageId?: string | null;
  createdAt: Date;
  status: string;
}): MessageDto {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
    status: 'SENT',
    clientMessageId: row.clientMessageId ?? null,
  };
}
