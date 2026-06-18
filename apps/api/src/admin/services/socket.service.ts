import { UserRepository } from '@/admin/repositories';
import { Injectable, Logger } from '@nestjs/common';
import { UserToken } from '@repo/database';
import {
  ClientToServerEvents,
  MessageEntity,
  RaidEntity,
  ResolvedSettingsEntity,
  RewardRedemptionData,
  ServerToClientEvents,
  TwitchChatterEntity,
  UserInfo,
  withSettingsDefaults,
} from '@repo/types';
import { Server, Socket } from 'socket.io';
import { SettingsRepository } from '../repositories/settings.repository';

import {
  EventClient,
  EventClientFactory,
} from '../event-client/event-client.factory';
import { ActionService } from './action.service';
import { ChatMessageService } from './chat-message.service';
import { ChatterRepository } from '../repositories/chatter.repository';
import { IEmoteClient, EmoteService } from './emotes/emote.service';

type SocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

type SocketClient = {
  socket: Socket;
  roomId?: string;
};

type Room = {
  clients: Socket[];
  settings: ResolvedSettingsEntity;
  eventClient?: EventClient;
  emoteClient?: IEmoteClient;
};

@Injectable()
export class SocketService<
  TSocket extends Socket<ClientToServerEvents, ServerToClientEvents>,
> {
  private readonly logger = new Logger(SocketService.name);

  private readonly connectedClients: Map<string, SocketClient> = new Map();
  private readonly rooms: Map<string, Room> = new Map();

  // Set once by the gateway after the Socket.io server is initialized. Used to
  // broadcast to a whole room regardless of which socket triggered an event.
  private server!: SocketServer;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly chatterRepository: ChatterRepository,
    private readonly actionService: ActionService,
    private readonly chatMessageService: ChatMessageService,
    private readonly emoteService: EmoteService,
    private readonly eventClientFactory: EventClientFactory,
  ) {}

  public bindServer(server: SocketServer): void {
    this.server = server;
  }

  public getRooms(): Map<string, Room> {
    return this.rooms;
  }

  public handleDisconnect(socket: TSocket): void {
    this.processDisconnect(socket);
    this.connectedClients.delete(socket.id);
    this.logger.log('Socket disconnected with id: ' + socket.id);
  }

  public async handleConnection(socket: TSocket): Promise<void> {
    this.logger.log('Socket connected with id: ' + socket.id);

    const userGuid = socket.handshake.auth.userGuid;
    const user = await this.authenticate(socket, userGuid);
    if (!user) {
      return;
    }

    await socket.join(userGuid);
    this.connectedClients.set(socket.id, { socket, roomId: userGuid });

    const settings = withSettingsDefaults(
      (await this.settingsRepository.get(user.userId)).data,
    );
    socket.emit('settings', settings);

    const room = this.rooms.get(userGuid);
    if (room) {
      room.clients.push(socket);
      return;
    }

    await this.createRoom(socket, userGuid, user, settings);
  }

  /**
   * Validates the handshake and resolves the room owner. Disconnects the socket
   * and returns null when the guid is missing, unknown, or revoked.
   */
  private async authenticate(
    socket: TSocket,
    userGuid: string | undefined,
  ): Promise<UserToken | null> {
    if (!userGuid) {
      this.logger.warn('User guid is not provided.');
      socket.disconnect();
      return null;
    }

    const user = await this.getUserByGuid(userGuid);

    if (!user) {
      this.logger.log('User does not exist.');
      socket.disconnect();
      return null;
    }

    if (user.isTokenRevoked) {
      this.logger.log(`User [${user.userId}] token is revoked.`);
      socket.disconnect();
      return null;
    }

    return user;
  }

  private async createRoom(
    socket: TSocket,
    roomId: string,
    user: UserToken,
    settings: ResolvedSettingsEntity,
  ): Promise<void> {
    // Reserve the room synchronously so concurrent connections for the same
    // user attach to it instead of spinning up a second set of clients.
    const room: Room = { clients: [socket], settings };
    this.rooms.set(roomId, room);
    this.logger.log('Room initialized with id: ' + roomId);

    const eventClient = await this.eventClientFactory.createFromUser(user);
    const emoteClient = await this.emoteService.createClient(
      user.platformUserId,
    );

    // Every client may have disconnected while we were awaiting the clients
    // above; in that case the room is already torn down.
    if (this.rooms.get(roomId) !== room) {
      void eventClient.disconnect();
      emoteClient.disconnect();
      return;
    }

    room.eventClient = eventClient;
    room.emoteClient = emoteClient;

    this.registerEventHandlers(roomId, user, eventClient, emoteClient);

    eventClient.connect();
    emoteClient.connect();

    this.logger.log('Chat client initialized in room with id: ' + roomId);
  }

  private registerEventHandlers(
    roomId: string,
    user: UserToken,
    eventClient: EventClient,
    emoteClient: IEmoteClient,
  ): void {
    eventClient.onChatMessage((data) =>
      this.handleChatMessage(roomId, user, emoteClient, data),
    );
    eventClient.onChatters((data) => this.handleChatters(roomId, data));
    eventClient.onRaid((data) => this.handleRaid(roomId, user, data));
    eventClient.onRewardRedemptionAdd((data) =>
      this.handleReward(roomId, user, data),
    );
  }

  private async handleChatMessage(
    roomId: string,
    user: UserToken,
    emoteClient: IEmoteClient,
    data: MessageEntity,
  ): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room || this.isHiddenChatter(data.info.displayName, room.settings)) {
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

      this.server.to(roomId).emit('action', actionData);
    }

    const message = this.chatMessageService.formatMessage(data.message);

    const strippedMessage = this.chatMessageService.stripEmotes(
      message,
      customEmotes.map((emote) => emote.name),
    );

    if (strippedMessage || emotes.length > 0) {
      const info = await this.getChatterInfo(
        user.userId,
        data.userId,
        data.info,
      );

      this.server.to(roomId).emit('message', {
        ...data,
        message: strippedMessage,
        emotes,
        info,
      });
    }
  }

  private handleChatters(roomId: string, data: TwitchChatterEntity[]): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    const entities = data.filter(
      (entity) => !this.isHiddenChatter(entity.name, room.settings),
    );

    this.server.to(roomId).emit('chatters', entities);
  }

  private async handleRaid(
    roomId: string,
    user: UserToken,
    data: RaidEntity,
  ): Promise<void> {
    if (!this.rooms.has(roomId)) {
      return;
    }

    const info = await this.getChatterInfo(
      user.userId,
      data.broadcaster.id,
      data.broadcaster.info,
    );

    this.server.to(roomId).emit('raid', {
      ...data,
      broadcaster: { ...data.broadcaster, info },
    });
  }

  private async handleReward(
    roomId: string,
    user: UserToken,
    data: RewardRedemptionData,
  ): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room || this.isHiddenChatter(data.userDisplayName, room.settings)) {
      return;
    }

    const action = await this.actionService.getUserActionByReward(
      user.userId,
      user.platformUserId,
      data,
    );

    if (!action) {
      return;
    }

    const info = await this.getChatterInfo(user.userId, data.userId, action.info);

    this.server.to(roomId).emit('action', { ...action, info });
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

    room.clients = room.clients.filter((client) => client.id !== socket.id);

    if (room.clients.length === 0) {
      void room.eventClient?.disconnect();
      room.emoteClient?.disconnect();
      this.rooms.delete(connectedClient.roomId);
      this.logger.log('Room disconnected with name: ' + connectedClient.roomId);
    }
  }

  private isHiddenChatter(
    userName: string,
    settings: ResolvedSettingsEntity,
  ): boolean {
    return settings.hiddenUsers
      .split(' ')
      .some((user) => user.toLowerCase() == userName.toLowerCase());
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
