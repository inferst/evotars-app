import { AdminGuard } from '@/auth/guards/admin.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClientToServerEvents, ServerToClientEvents } from '@repo/types';
import { Socket } from 'socket.io';
import { SocketService } from '../services';

@Controller('/session')
export class SessionController {
  public constructor(
    private readonly socketService: SocketService<
      Socket<ServerToClientEvents, ClientToServerEvents>
    >,
  ) {}

  @Get()
  @UseGuards(AdminGuard)
  public getSessions(): unknown {
    const entries = this.socketService.getRooms().entries();
    return Array.from(entries).map((entry) => {
      return {
        id: entry[0],
        clients: entry[1].clients.map((client) => client.id),
      };
    });
  }
}
