import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import z from 'zod';

const schema = z.object({
  HOST: z.string(),
  HOST_URL: z.string(),
  ADMIN_URL: z.string(),
  CLIENT_URL: z.string(),
  TWITCH_CLIENT_ID: z.string(),
  TWITCH_CLIENT_SECRET: z.string(),
  TWITCH_WEBHOOK_SECRET: z.string(),
  TWITCH_CALLBACK_URL: z.string(),
  SESSION_SECRET: z.string(),
  DATABASE_URL: z.string(),
});

@Global()
@Module({
  exports: [ConfigService],
  imports: [
    NestConfigModule.forRoot({
      validate: (env) => schema.parse(env),
      validationOptions: {
        abortEarly: true,
      },
    }),
  ],
  controllers: [],
  providers: [ConfigService],
})
export class ConfigModule {}
