import {
  Emote,
  IEmoteClient,
  IEmoteService,
} from '@/admin/services/emotes/emote.service';
import { ConfigService } from '@/config/config.service';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { WebSocket } from 'ws';
import { z } from 'zod';

type SevenTVEmoteData = {
  userId: string;
  emoteSetId: string;
  data: SevenTVEmotes;
};

type SevenTVEmotes = {
  [name: string]: string;
};

const SevenTVEventEmoteSchema = z.object({
  name: z.string(),
  data: z.object({
    animated: z.boolean(),
    host: z.object({
      url: z.string(),
    }),
  }),
});

const SevenTVTwitchUserDataSchema = z.object({
  emote_set: z.object({
    id: z.string(),
    emotes: z.array(SevenTVEventEmoteSchema),
  }),
  user: z.object({
    id: z.string(),
  }),
});

const SevenTVUserUpdateSchema = z.object({
  type: z.literal('user.update'),
  body: z.object({
    updated: z.array(
      z.object({
        key: z.literal('connections'),
        value: z.array(
          z.object({
            key: z.literal('emote_set_id'),
            old_value: z.string(),
            value: z.string(),
          }),
        ),
      }),
    ),
  }),
});

const SevenTVEmoteSetUpdateSchema = z.object({
  type: z.literal('emote_set.update'),
  body: z.object({
    pushed: z.array(
      z.object({
        value: z.object({
          name: z.string(),
          data: z.object({
            animated: z.boolean(),
            host: z.object({
              url: z.string(),
            }),
          }),
        }),
      }),
    ),
    pulled: z.array(
      z.object({
        old_value: z.object({
          name: z.string(),
        }),
      }),
    ),
  }),
});

const SevenTVUpdateSchema = z.object({
  d: z.discriminatedUnion('type', [
    SevenTVEmoteSetUpdateSchema,
    SevenTVUserUpdateSchema,
  ]),
});

const UserDataSchema = z.object({
  data: SevenTVTwitchUserDataSchema,
});

const GlobalDataSchema = z.object({
  data: z.object({
    emotes: z.array(SevenTVEventEmoteSchema),
  }),
});

@Injectable()
export class SevenTVEmoteService implements IEmoteService {
  private readonly logger = new Logger(SevenTVEmoteService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  public async createClient(platformUserId: string): Promise<IEmoteClient> {
    const hostUrl = this.configService.hostUrl;

    let emotes: SevenTVEmotes = {};

    let connection: WebSocket | undefined;

    let isClosed = false;

    const connect = async (): Promise<WebSocket | undefined> => {
      let emotesData = await this.getEmotesData(platformUserId);

      if (!emotesData) {
        return;
      }

      emotes = emotesData.data;

      const ws = new WebSocket('wss://events.7tv.io/v3');

      const emoteSetId = emotesData.emoteSetId;

      const userUpdateSubscribe = {
        op: 35,
        d: {
          type: 'user.update',
          condition: {
            object_id: emotesData.userId,
          },
        },
      };

      const emoteSetUpdateSubscribe = {
        op: 35,
        d: {
          type: 'emote_set.update',
          condition: {
            object_id: emoteSetId,
          },
        },
      };

      ws.onopen = (): void => {
        ws.send(JSON.stringify(emoteSetUpdateSubscribe));
        ws.send(JSON.stringify(userUpdateSubscribe));

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data as string);
            const result = SevenTVUpdateSchema.safeParse(data);

            if (result.success) {
              if (result.data.d.type == 'user.update') {
                const body = result.data.d.body;

                const event = body.updated
                  .find((event) => event.key == 'connections')
                  ?.value.find((value) => value.key == 'emote_set_id');

                if (event) {
                  ws.send(
                    JSON.stringify({
                      op: 36,
                      d: {
                        type: 'emote_set.update',
                        condition: {
                          object_id: event.old_value,
                        },
                      },
                    }),
                  );

                  ws.send(
                    JSON.stringify({
                      op: 35,
                      d: {
                        type: 'emote_set.update',
                        condition: {
                          object_id: event.value,
                        },
                      },
                    }),
                  );

                  emotesData = await this.getEmotesData(platformUserId);

                  if (emotesData) {
                    emotes = emotesData.data;
                  }
                }
              }

              if (result.data.d.type == 'emote_set.update') {
                const body = result.data.d.body;

                const pulled = body.pulled;
                const pushed = body.pushed;

                if (pulled) {
                  const data = pulled.map((emote) => emote.old_value.name);

                  for (const name of data) {
                    delete emotes[name];
                  }
                }

                if (pushed) {
                  const entries = pushed.map((emote) => {
                    const data = emote.value.data;
                    const url = data.animated
                      ? data.host.url + '/4x.gif'
                      : data.host.url + '/4x.png';

                    return [
                      emote.value.name,
                      url.replace('//cdn.7tv.app', hostUrl + '/7tv-emotes'),
                    ];
                  });

                  emotes = { ...emotes, ...Object.fromEntries(entries) };
                }
              }
            }
          } catch (e) {
            this.logger.error(
              'Failed to process 7TV Web socket message.',
              e.toString(),
            );
          }
        };

        this.logger.log(`ObjectId: [${emoteSetId}] 7TV Web socket connected`);
      };

      ws.onclose = async (): Promise<void> => {
        if (!isClosed) {
          setTimeout(async () => {
            connection = await connect();
          }, 10000);
        }

        this.logger.log(`ObjectId: [${emoteSetId}] 7TV Web socket closed`);
      };

      ws.onerror = (): void => {
        this.logger.log(`ObjectId: [${emoteSetId}] 7TV Web socket error`);
      };

      return ws;
    };

    return {
      getEmotes: (text: string): Emote[] => {
        const entries = text
          .split(' ')
          .filter((word) => emotes[word])
          .map((word) => ({ name: word, url: emotes[word] }));

        return entries;
      },
      connect: async (): Promise<void> => {
        connection = await connect();
      },
      disconnect: (): void => {
        connection?.close();
        isClosed = true;
      },
    };
  }

  public async getEmotesData(
    platformUserId: string,
  ): Promise<SevenTVEmoteData | undefined> {
    try {
      const hostUrl = this.configService.hostUrl;
      const userUrl = `https://7tv.io/v3/users/twitch/${platformUserId}?t=${Date.now()}`;
      const globalUrl = 'https://7tv.io/v3/emote-sets/global';

      const promises: [Promise<unknown>, Promise<unknown>] = [
        firstValueFrom(this.httpService.get(userUrl)),
        firstValueFrom(this.httpService.get(globalUrl)),
      ];

      const [userData, globalData] = await Promise.all(promises);

      const userDataResult = UserDataSchema.safeParse(userData);
      const globalDataResult = GlobalDataSchema.safeParse(globalData);

      if (!userDataResult.success || !globalDataResult.success) {
        throw new Error('Failed to parse data');
      }

      const emotes = [
        ...userDataResult.data.data.emote_set.emotes,
        ...globalDataResult.data.data.emotes,
      ];

      const emoteEntries = emotes.map((emote) => {
        const host = emote.data.host;
        const url = host.url + (emote.data.animated ? '/4x.gif' : '/4x.png');
        return [
          emote.name,
          url.replace('//cdn.7tv.app', hostUrl + '/7tv-emotes'),
        ];
      });

      return {
        userId: userDataResult.data.data.user.id,
        emoteSetId: userDataResult.data.data.emote_set.id,
        data: Object.fromEntries(emoteEntries),
      };
    } catch (e) {
      this.logger.error('Failed to fetch the emotes data.', e.toString());
      return;
    }
  }
}
