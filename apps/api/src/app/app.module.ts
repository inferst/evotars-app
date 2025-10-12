import { AdminModule } from '@/admin/admin.module';
import { AuthModule } from '@/auth/auth.module';
import { ConfigModule } from '@/config/config.module';
import { DatabaseModule } from '@/database/database.module';
import { Module } from '@nestjs/common';
import { APP_FILTER, RouterModule } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ServeStaticModule } from '@nestjs/serve-static';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { join } from 'path';
import { AppController } from './controllers/app.controller';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule,
    DatabaseModule,
    AuthModule,
    AdminModule,
    PassportModule.register({ session: true }),
    RouterModule.register([
      {
        path: '/auth',
        module: AuthModule,
      },
      {
        path: '/admin',
        module: AdminModule,
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../', 'client/dist'),
      renderPath: '*path',
      serveRoot: '/client',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../', 'admin/dist'),
      renderPath: '*path',
      serveRoot: '/admin',
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
