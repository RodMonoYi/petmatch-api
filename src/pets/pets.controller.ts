import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import * as path from 'path';
import { diskStorage } from 'multer';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { SearchPetsDto } from './dto/search-pets.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const petPhotosPath = path.join(
  process.cwd(),
  'public',
  'uploads',
  'pet-photos',
);
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  create(@Body() createPetDto: CreatePetDto, @Request() req) {
    return this.petsService.create(createPetDto, req.user.id);
  }

  @Post('photos')
  @UseInterceptors(
    FilesInterceptor('fotos', 6, {
      limits: {
        fileSize: 3 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!allowedImageTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Envie imagens JPG, PNG ou WebP'),
            false,
          );
        }

        callback(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          mkdirSync(petPhotosPath, { recursive: true });
          callback(null, petPhotosPath);
        },
        filename: (_req, file, callback) => {
          const extension = path.extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
    }),
  )
  uploadPhotos(@UploadedFiles() files: Array<{ filename: string }>) {
    if (!files?.length) {
      throw new BadRequestException('Envie pelo menos uma foto');
    }

    return {
      urls: files.map((file) => `/uploads/pet-photos/${file.filename}`),
    };
  }

  @Get()
  findAll(@Query() searchDto: SearchPetsDto, @Request() req) {
    return this.petsService.findAll(searchDto, req.user.id);
  }

  @Get('my-pets')
  findMyPets(@Request() req) {
    return this.petsService.findMyPets(req.user.id);
  }

  @Get('saved')
  findSaved(@Request() req) {
    return this.petsService.findSaved(req.user.id);
  }

  @Post(':id/save')
  savePet(@Param('id') id: string, @Request() req) {
    return this.petsService.savePet(id, req.user.id);
  }

  @Delete(':id/save')
  unsavePet(@Param('id') id: string, @Request() req) {
    return this.petsService.unsavePet(id, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.petsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePetDto: UpdatePetDto,
    @Request() req,
  ) {
    return this.petsService.update(id, updatePetDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.petsService.remove(id, req.user.id);
  }
}
