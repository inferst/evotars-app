import { UserActionEntity } from './action';
import { TwitchChatterEntity } from './chatter';
import { RaidEntity } from './raid';
import { MessageEntity } from './message';
import { ResolvedSettingsEntity } from './settings';

export type ServerToClientEvents = {
  message: (data: MessageEntity) => void;
  settings: (data: ResolvedSettingsEntity) => void;
  chatters: (data: TwitchChatterEntity[]) => void;
  action: (data: UserActionEntity) => void;
  raid: (data: RaidEntity) => void;
};

export interface ClientToServerEvents {
  initialize: (data: { roomId: string }) => void;
}
