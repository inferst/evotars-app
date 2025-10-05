import { SevenTVEmoteService } from '@/admin/services/emotes/7tv-emote.service';
import { BTTVEmoteService } from '@/admin/services/emotes/bttv-emote.service';
import { Injectable } from '@nestjs/common';

export type Emote = {
  name: string;
  url: string;
};

export interface IEmoteClient {
  connect: () => void;
  disconnect: () => void;
  getEmotes: (text: string) => Emote[];
}

export interface IEmoteService {
  createClient: (platformUserId: string) => Promise<IEmoteClient>;
}

@Injectable()
export class EmoteService {
  constructor(
    private readonly sevenTVEmoteService: SevenTVEmoteService,
    private readonly BTTVEmoteService: BTTVEmoteService,
  ) {}

  public async createClient(platformUserId: string): Promise<IEmoteClient> {
    const providers: IEmoteClient[] = [
      await this.sevenTVEmoteService.createClient(platformUserId),
      await this.BTTVEmoteService.createClient(platformUserId),
    ];

    return {
      getEmotes: (text: string): Emote[] => {
        return providers.map((provider) => provider.getEmotes(text)).flat();
      },
      connect: async (): Promise<void> => {
        for (const provider of providers) {
          provider.connect();
        }
      },
      disconnect: (): void => {
        for (const provider of providers) {
          provider.disconnect();
        }
      },
    };
  }
}
