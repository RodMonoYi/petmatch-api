import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetsService } from './pets.service';
import { PetsController } from './pets.controller';
import { Pet } from '../entities/pet.entity';
import { SavedPet } from '../entities/saved-pet.entity';
import { Swipe } from '../entities/swipe.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pet, SavedPet, Swipe])],
  controllers: [PetsController],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
