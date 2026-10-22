import { UserActionEntity } from './action';
import { BanEntity } from './ban';
import { TwitchChatterEntity } from './chatter';
import { RaidEntity } from './raid';
import { MessageDeleteEntity, MessageEntity } from './message';
import { SettingsEntity } from './settings';

export type ServerToClientsEvents = {
  message: (data: MessageEntity) => void;
  messageDelete: (data: MessageDeleteEntity) => void;
  ban: (data: BanEntity) => void;
  settings: (data: SettingsEntity) => void;
  chatters: (data: TwitchChatterEntity[]) => void;
  action: (data: UserActionEntity) => void;
  raid: (data: RaidEntity) => void;
};

export interface ClientToServerEvents {
  initialize: (data: { roomId: string }) => void;
}
