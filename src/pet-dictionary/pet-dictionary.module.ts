import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PetDictionaryEntry } from '../entities/pet-dictionary-entry.entity';
import { Pet } from '../entities/pet.entity';
import { AdminPetDictionaryController } from './admin-pet-dictionary.controller';
import { PetDictionaryController } from './pet-dictionary.controller';
import { PetDictionaryService } from './pet-dictionary.service';

@Module({
  imports: [TypeOrmModule.forFeature([PetDictionaryEntry, Pet]), AuthModule],
  controllers: [PetDictionaryController, AdminPetDictionaryController],
  providers: [PetDictionaryService],
  exports: [PetDictionaryService],
})
export class PetDictionaryModule {}
