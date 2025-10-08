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

type FFZEmoteData = {
  data: FFZEmotes;
};

type FFZEmotes = {
  [name: string]: string;
};

const FFZEmoteSchema = z.object({
  id: z.number(),
  name: z.string(),
  urls: z.object({
    1: z.string(),
    2: z.string().optional(),
    4: z.string().optional(),
  }),
});

const UserDataSchema = z.object({
  data: z.object({
    sets: z.record(
      z.string(),
      z.object({
        emoticons: z.array(FFZEmoteSchema),
      }),
    ),
  }),
});

@Injectable()
export class FFZEmoteService implements IEmoteService {
  private readonly logger = new Logger(FFZEmoteService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  public async createClient(platformUserId: string): Promise<IEmoteClient> {
    let emotes: FFZEmotes = {};

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
  ): Promise<FFZEmoteData | undefined> {
    try {
      const hostUrl = this.configService.hostUrl;
      const url = `https://api.frankerfacez.com/v1/room/id/${platformUserId}`;
      const data: unknown = await firstValueFrom(this.httpService.get(url));

      const userDataResult = UserDataSchema.safeParse(data);

      if (!userDataResult.success) {
        throw new Error('Failed to parse data');
      }

      const sets = Object.values(userDataResult.data.data.sets);

      const emotes = [...sets.map((set) => set.emoticons).flat()];

      const emoteEntries = emotes.map((emote) => {
        const originalURL = emote.urls[4] ?? emote.urls[2] ?? emote.urls[1];
        const url = originalURL.replace(
          'https://cdn.frankerfacez.com',
          hostUrl + '/ffz-emotes',
        );
        return [emote.name, url];
      });

      return {
        data: Object.fromEntries(emoteEntries),
      };
    } catch (e) {
      this.logger.error('Failed to fetch the emotes data.', e.toString());
      return;
    }
  }
}
