import { UserRepository } from '@/admin/repositories';
import { Injectable, Logger } from '@nestjs/common';
import { Settings, UserToken } from '@repo/database';
import {
  ClientToServerEvents,
  ServerToClientsEvents,
  UserInfo,
} from '@repo/types';
import { Socket } from 'socket.io';
import { SettingsRepository } from '../repositories/settings.repository';

import {
  EventClient,
  EventClientFactory,
} from '../event-client/event-client.factory';
import { ActionService } from './action.service';
import { ChatMessageService } from './chat-message.service';
import { ChatterRepository } from '../repositories/chatter.repository';
import { IEmoteClient, EmoteService } from './emotes/emote.service';

type SocketClient = {
  socket: Socket;
  roomId?: string;
};

type Room = {
  clients: Socket[];
  eventClient?: EventClient;
  emoteClient?: IEmoteClient;
};

@Injectable()
export class SocketService<
  TSocket extends Socket<ClientToServerEvents, ServerToClientsEvents>,
> {
  private readonly logger = new Logger(SocketService.name);

  private readonly connectedClients: Map<string, SocketClient> = new Map();
  private readonly rooms: Map<string, Room> = new Map();

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly chatterRepository: ChatterRepository,
    private readonly actionService: ActionService,
    private readonly chatMessageService: ChatMessageService,
    private readonly emoteService: EmoteService,
    private readonly eventClinetFactory: EventClientFactory,
  ) {}

  public getRooms(): Map<string, Room> {
    return this.rooms;
  }

  public handleDisconnect(socket: TSocket): void {
    this.processDisconnect(socket);
    this.connectedClients.delete(socket.id);
    this.logger.log('Socket disconnected with id: ' + socket.id);
  }

  private processDisconnect(socket: Socket): void {
    const connectedClient = this.connectedClients.get(socket.id);
    if (!connectedClient?.roomId) {
      return;
    }

    const room = this.rooms.get(connectedClient.roomId);
    if (!room) {
      return;
    }

    const clients = room.clients.filter(
      (client) => client.id !== connectedClient.socket.id,
    );

    if (clients.length > 0) {
      this.rooms.set(connectedClient.roomId, { ...room, clients });
    } else {
      void room.eventClient?.disconnect();
      room.emoteClient?.disconnect();
      this.rooms.delete(connectedClient.roomId);
      this.logger.log('Room disconnected with name: ' + connectedClient.roomId);
    }
  }

  public async handleConnection(socket: TSocket): Promise<void> {
    this.logger.log('Socket connected with id: ' + socket.id);

    const userGuid = socket.handshake.auth.userGuid;
    if (!userGuid) {
      this.logger.warn('User guid is not provided.');
      socket.disconnect();
      return;
    }

    const user = await this.getUserByGuid(userGuid);

    if (!user) {
      this.logger.log('User does not exist.');
      socket.disconnect();
      return;
    }

    if (user.isTokenRevoked) {
      this.logger.log(`User [${user.userId}] token is revoked.`);
      socket.disconnect();
      return;
    }

    const room = this.rooms.get(userGuid);

    await socket.join(userGuid);

    this.connectedClients.set(socket.id, { socket, roomId: userGuid });

    const settings = await this.settingsRepository.get(user.userId);

    socket.emit('settings', settings.data);

    if (room) {
      this.rooms.set(userGuid, { ...room, clients: [...room.clients, socket] });
      return;
    }

    this.rooms.set(userGuid, {
      clients: [socket],
    });

    this.logger.log('Room initialized with id: ' + userGuid);

    const eventClient = await this.eventClinetFactory.createFromUser(user);
    eventClient.connect();

    const emoteClient = await this.emoteService.createClient(
      user.platformUserId,
    );
    emoteClient.connect();

    const connectedRoom = this.rooms.get(userGuid);

    if (connectedRoom) {
      this.rooms.set(userGuid, { ...connectedRoom, eventClient, emoteClient });
    }

    eventClient.onChatMessage(async (data) => {
      if (this.isHiddenChatter(data.info.displayName, settings)) {
        return;
      }

      const customEmotes = emoteClient.getEmotes(data.message);
      const emotes = data.emotes.concat(customEmotes.map((emote) => emote.url));

      const action = await this.actionService.getUserActionByMessage(
        user.userId,
        data.message,
        data.userId,
        data.info,
      );

      if (action) {
        const actionData = {
          ...data,
          ...action,
          emotes,
          cooldown: 0,
        };

        socket.emit('action', actionData);
        socket.broadcast.to(userGuid).emit('action', actionData);
      }

      const message = this.chatMessageService.formatMessage(data.message);

      const strippedMessage = this.chatMessageService.stripEmotes(
        message,
        customEmotes.map((emote) => emote.name),
      );

      if (strippedMessage || emotes.length > 0) {
        const chatterInfo = await this.getChatterInfo(
          user.userId,
          data.userId,
          data.info,
        );

        const messageData = {
          ...data,
          message: strippedMessage,
          emotes,
          info: chatterInfo,
        };

        socket.emit('message', messageData);
        socket.broadcast.to(userGuid).emit('message', messageData);
      }
    });

    eventClient.onChatters((data) => {
      const entities = data.filter(
        (entity) => !this.isHiddenChatter(entity.name, settings),
      );

      socket.emit('chatters', entities);
      socket.broadcast.to(userGuid).emit('chatters', entities);
    });

    eventClient.onRaid(async (data) => {
      const chatterInfo = await this.getChatterInfo(
        user.userId,
        data.broadcaster.id,
        data.broadcaster.info,
      );

      socket.emit('raid', data);
      socket.broadcast.to(userGuid).emit('raid', {
        ...data,
        broadcaster: {
          ...data.broadcaster,
          ...chatterInfo,
        },
      });
    });

    eventClient.onRewardRedemptionAdd(async (data) => {
      if (this.isHiddenChatter(data.userDisplayName, settings)) {
        return;
      }

      const action = await this.actionService.getUserActionByReward(
        user.userId,
        user.platformUserId,
        data,
      );

      if (action) {
        const chatterInfo = await this.getChatterInfo(
          user.userId,
          data.userId,
          action.info,
        );

        const actionData = {
          ...action,
          info: chatterInfo,
        };

        socket.emit('action', actionData);
        socket.broadcast.to(userGuid).emit('action', actionData);
      }
    });

    this.logger.log('Chat client initialized in room with id: ' + userGuid);
  }

  private isHiddenChatter(userName: string, settings: Settings): boolean {
    return (
      settings.data.hiddenUsers
        ?.split(' ')
        .some((user) => user.toLowerCase() == userName.toLowerCase()) ?? false
    );
  }

  private async getChatterInfo(
    userId: number,
    chatterId: string,
    info: UserInfo,
  ): Promise<UserInfo> {
    const chatter = await this.chatterRepository.getChatterById(
      userId,
      chatterId,
    );

    const sprite = chatter?.sprite ? chatter.sprite : 'default';
    const color = chatter?.color ? chatter.color : info.color;

    return {
      ...info,
      sprite,
      color,
    };
  }

  private async getUserByGuid(userGuid: string): Promise<UserToken | null> {
    try {
      return await this.userRepository.getTwitchUserByGuid(userGuid);
    } catch (error) {
      this.logger.error('Failed to fetch the user.', {
        e: error,
      });
    }

    return null;
  }
}
