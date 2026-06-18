import { PrismaService } from '@/database/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  User,
  defaultCommandsSeed,
  defaultUserSkinCollection,
  defaultUserSkins,
} from '@repo/database';

@Injectable()
export class SeedService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async createDefaultData(user: User): Promise<void> {
    await defaultCommandsSeed(this.prismaService, user);
    await defaultUserSkinCollection(this.prismaService, user.id);
    await defaultUserSkins(this.prismaService, user.id);
  }
}
