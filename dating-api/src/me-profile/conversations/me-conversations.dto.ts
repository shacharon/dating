export interface ConversationOtherUserDto {
  id: string;
  profileId: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  photoUrl: string | null;
}

export interface ConversationLastMessageDto {
  text: string;
  senderId: string;
  /** ISO-8601 from Message.createdAt */
  sentAt: string;
}

export interface ConversationListItemDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  unreadCount: number;
  lastMessage: ConversationLastMessageDto | null;
}

export interface ConversationListResponseDto {
  conversations: ConversationListItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ConversationsUnreadTotalDto {
  totalUnread: number;
}

export interface ConversationDetailDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  status: 'ACTIVE';
  lastReadAt: string | null;
}

export interface MarkConversationReadResponseDto {
  lastReadAt: string;
}
