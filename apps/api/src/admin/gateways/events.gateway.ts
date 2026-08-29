import { Server, Socket } from 'socket.io';
import { SocketService } from '@/admin/services';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ClientToServerEvents, ServerToClientEvents } from '@repo/types';

@WebSocketGateway({
  cors: true,
  transport: ['websocket'],
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server<ClientToServerEvents, ServerToClientEvents>;

  public constructor(
    private readonly socketService: SocketService<
      Socket<ClientToServerEvents, ServerToClientEvents>
    >,
  ) {}

  public afterInit(): void {
    this.socketService.bindServer(this.server);
  }

  public handleDisconnect(socket: Socket): void {
    this.socketService.handleDisconnect(socket);
  }

  public handleConnection(socket: Socket): void {
    void this.socketService.handleConnection(socket);
  }
}
