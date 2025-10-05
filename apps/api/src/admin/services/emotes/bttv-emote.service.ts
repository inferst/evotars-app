import {
  Emote,
  IEmoteClient,
  IEmoteService,
} from '@/admin/services/emotes/emote.service';
import { ConfigService } from '@/config/config.service';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

type BTTVEmoteData = {
  userId: string;
  data: BTTVEmotes;
};

type BTTVEmotes = {
  [name: string]: string;
};

const BTTVEmoteSchema = z.object({
  id: z.string(),
  code: z.string(),
  imageType: z.string(),
  animated: z.boolean(),
});

const UserDataSchema = z.object({
  data: z.object({
    id: z.string(),
    sharedEmotes: z.array(BTTVEmoteSchema),
    channelEmotes: z.array(BTTVEmoteSchema),
  }),
});

@Injectable()
export class BTTVEmoteService implements IEmoteService {
  private readonly logger = new Logger(BTTVEmoteService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  public async createClient(platformUserId: string): Promise<IEmoteClient> {
    let emotes: BTTVEmotes = {};

    const emotesData = await this.getEmotesData(platformUserId);

    if (emotesData) {
      emotes = emotesData.data;
    }

    return {
      getEmotes: (text: string): Emote[] => {
        const entries = text
          .split(' ')
          .filter((word) => emotes[word])
          .map((word) => ({ name: word, url: emotes[word] }));

        return entries;
      },
      connect: async (): Promise<void> => {},
      disconnect: (): void => {},
    };
  }

  public async getEmotesData(
    platformUserId: string,
  ): Promise<BTTVEmoteData | undefined> {
    try {
      const hostUrl = this.configService.hostUrl;
      const url = `https://api.betterttv.net/3/cached/users/twitch/${platformUserId}`;
      const data: unknown = await firstValueFrom(this.httpService.get(url));

      const userDataResult = UserDataSchema.safeParse(data);

      if (!userDataResult.success) {
        throw new Error('Failed to parse data');
      }

      const emotes = [
        ...userDataResult.data.data.channelEmotes,
        ...userDataResult.data.data.sharedEmotes,
      ];

      const emoteEntries = emotes.map((emote) => {
        const url = `${hostUrl}/bttv-emotes/emote/${emote.id}/3x.${emote.imageType}`;
        return [emote.code, url];
      });

      return {
        userId: userDataResult.data.data.id,
        data: Object.fromEntries(emoteEntries),
      };
    } catch (e) {
      this.logger.error('Failed to fetch the emotes data.', e.toString());
      return;
    }
  }
}
