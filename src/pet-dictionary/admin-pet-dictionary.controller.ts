import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { PetDictionaryCategory } from '../entities/pet-dictionary-entry.entity';
import { CreatePetDictionaryEntryDto } from './dto/create-pet-dictionary-entry.dto';
import { UpdatePetDictionaryEntryDto } from './dto/update-pet-dictionary-entry.dto';
import { PetDictionaryService } from './pet-dictionary.service';

@Controller('admin/pet-dictionary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPetDictionaryController {
  constructor(private readonly petDictionaryService: PetDictionaryService) {}

  @Get()
  list(@Query('category') category?: PetDictionaryCategory) {
    return this.petDictionaryService.list(category);
  }

  @Post()
  create(@Body() createDto: CreatePetDictionaryEntryDto) {
    return this.petDictionaryService.create(createDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePetDictionaryEntryDto,
  ) {
    return this.petDictionaryService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.petDictionaryService.remove(id);
  }

  @Post('rebuild')
  rebuildPetKeys() {
    return this.petDictionaryService.rebuildPetKeys();
  }
}
