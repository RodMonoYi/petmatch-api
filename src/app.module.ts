import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PetsModule } from './pets/pets.module';
import { MatchesModule } from './matches/matches.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { createTypeOrmOptions } from './config/database.config';
import { AdsModule } from './ads/ads.module';
import { PetDictionaryModule } from './pet-dictionary/pet-dictionary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        createTypeOrmOptions(configService),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    PetsModule,
    MatchesModule,
    ChatModule,
    NotificationsModule,
    PetDictionaryModule,
    AdsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
