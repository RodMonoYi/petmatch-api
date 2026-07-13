import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { PetDictionaryCategory } from '../entities/pet-dictionary-entry.entity';
import { PetDictionaryService } from './pet-dictionary.service';

@Controller('pet-dictionary')
@UseGuards(JwtAuthGuard)
export class PetDictionaryController {
  constructor(private readonly petDictionaryService: PetDictionaryService) {}

  @Get()
  listActive(@Query('category') category?: PetDictionaryCategory) {
    return this.petDictionaryService.listActive(category);
  }
}
