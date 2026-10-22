import { UserInfo } from './user';

export type MessageEntity = {
  id: string;
  userId: string;
  message: string;
  emotes: string[];
  info: UserInfo;
};

export type MessageDeleteEntity = {
  messageId: string;
};
