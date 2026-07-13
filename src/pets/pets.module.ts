import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetsService } from './pets.service';
import { PetsController } from './pets.controller';
import { Pet } from '../entities/pet.entity';
import { SavedPet } from '../entities/saved-pet.entity';
import { Swipe } from '../entities/swipe.entity';
import { PetDictionaryModule } from '../pet-dictionary/pet-dictionary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Pet, SavedPet, Swipe]), PetDictionaryModule],
  controllers: [PetsController],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
