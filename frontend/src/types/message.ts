export type ChatUser = {
  id?: string;
  name?: string;
  username?: string;
  avatar?: string;
  role?: string;
  isFollowing?: boolean;
  followersCount?: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt?: string;
  isMine?: boolean;
  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
  reactionCounts?: Record<string, number>;
  userReaction?: ChatReaction;
};

export type Conversation = {
  id: string;
  participants: ChatUser[];
  lastMessage?: ChatMessage | null;
  lastMessageAt?: string;
  unreadCount?: number;
};

export type ChatAttachment = {
  url: string;
  name?: string;
  mime?: string;
  size?: number;
};

export type ChatReaction = {
  userId?: string;
  type: string;
  emoji?: string;
};
