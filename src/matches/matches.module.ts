import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { Match } from '../entities/match.entity';
import { Swipe } from '../entities/swipe.entity';
import { Conversation } from '../entities/conversation.entity';
import { Pet } from '../entities/pet.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PetDictionaryModule } from '../pet-dictionary/pet-dictionary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Swipe, Conversation, Pet, User]),
    NotificationsModule,
    PetDictionaryModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
