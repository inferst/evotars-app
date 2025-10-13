import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

type Config = {
  HOST: string;
  HOST_URL: string;
  ADMIN_URL: string;
  CLIENT_URL: string;
  SESSION_SECRET: string;
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  TWITCH_WEBHOOK_SECRET: string;
  TWITCH_CALLBACK_URL: string;
  DATABASE_URL: string;
  PWD: string;
};

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService<Config, true>) {}

  get host(): string {
    return this.configService.get('HOST');
  }

  get hostUrl(): string {
    return this.configService.get('HOST_URL');
  }

  get adminUrl(): string {
    return this.configService.get('ADMIN_URL');
  }

  get clientUrl(): string {
    return this.configService.get('CLIENT_URL');
  }

  get sessionSecret(): string {
    return this.configService.get('SESSION_SECRET');
  }

  get twitchClientId(): string {
    return this.configService.get('TWITCH_CLIENT_ID');
  }

  get twitchClientSecret(): string {
    return this.configService.get('TWITCH_CLIENT_SECRET');
  }

  get twitchWebhookSecret(): string {
    return this.configService.get('TWITCH_WEBHOOK_SECRET');
  }

  get twitchCallbackUrl(): string {
    return this.configService.get('TWITCH_CALLBACK_URL');
  }
}
