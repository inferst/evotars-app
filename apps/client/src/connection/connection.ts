import {
  BanEntity,
  ClientToServerEvents,
  MessageDeleteEntity,
  MessageEntity,
  RaidEntity,
  ServerToClientsEvents,
  SettingsEntity,
  TwitchChatterEntity,
  UserActionEntity,
} from '@repo/types';
import { Socket, io } from 'socket.io-client';

type ConnectionError = {
  message: string;
  description: string;
  context: string;
} & Error;

export class Connection {
  private socket!: Socket<ServerToClientsEvents, ClientToServerEvents>;

  public init(): void {
    const path = window.location.pathname.split('/');
    const userGuid = path[path.length - 1];

    const socket = io(import.meta.env.VITE_CLIENT_SOCKET_HOST, {
      transports: ['websocket'],
      auth: {
        userGuid,
      },
    });

    this.socket = socket;

    socket.on('connect_error', (err) => {
      const e = err as ConnectionError;

      console.log(e.message);
      console.log(e.description);
      console.log(e.context);
    });
  }

  public onMessage(callback: (data: MessageEntity) => void): void {
    this.socket.on('message', callback);
  }

  public onMessageDelete(callback: (data: MessageDeleteEntity) => void): void {
    this.socket.on('messageDelete', callback);
  }

  public onBan(callback: (data: BanEntity) => void): void {
    this.socket.on('ban', callback);
  }

  public onAction(callback: (data: UserActionEntity) => void): void {
    this.socket.on('action', callback);
  }

  public onSettings(callback: (data: SettingsEntity) => void): void {
    this.socket.on('settings', callback);
  }

  public onChatters(callback: (data: TwitchChatterEntity[]) => void): void {
    this.socket.on('chatters', callback);
  }

  public onRaid(callback: (data: RaidEntity) => void): void {
    this.socket.on('raid', callback);
  }
}
