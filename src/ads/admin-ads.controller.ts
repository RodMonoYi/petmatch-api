import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import * as path from 'path';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdsService } from './ads.service';
import { AdminAdsQueryDto } from './dto/admin-ads-query.dto';
import { CreateAdCompetitionGroupDto } from './dto/create-ad-competition-group.dto';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdCompetitionGroupDto } from './dto/update-ad-competition-group.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { UpdateAdStatusDto } from './dto/update-ad-status.dto';

const adImagesPath = path.join(process.cwd(), 'public', 'uploads', 'ad-images');
const allowedAdImageTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

@Controller('admin/ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('placements')
  listPlacements() {
    return this.adsService.listPlacements();
  }

  @Post('images')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!allowedAdImageTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Envie uma imagem JPG, PNG, WebP ou GIF'),
            false,
          );
        }

        callback(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          mkdirSync(adImagesPath, { recursive: true });
          callback(null, adImagesPath);
        },
        filename: (_req, file, callback) => {
          const extension = path.extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
    }),
  )
  uploadAdImage(@UploadedFile() file: { filename: string }) {
    if (!file) {
      throw new BadRequestException('Envie uma imagem para o anuncio');
    }

    return {
      url: `/uploads/ad-images/${file.filename}`,
    };
  }

  @Get('competition-groups')
  listCompetitionGroups() {
    return this.adsService.listCompetitionGroups();
  }

  @Post('competition-groups')
  createCompetitionGroup(
    @Body() createAdCompetitionGroupDto: CreateAdCompetitionGroupDto,
  ) {
    return this.adsService.createCompetitionGroup(createAdCompetitionGroupDto);
  }

  @Put('competition-groups/:id')
  updateCompetitionGroup(
    @Param('id') id: string,
    @Body() updateAdCompetitionGroupDto: UpdateAdCompetitionGroupDto,
  ) {
    return this.adsService.updateCompetitionGroup(id, updateAdCompetitionGroupDto);
  }

  @Delete('competition-groups/:id')
  removeCompetitionGroup(@Param('id') id: string) {
    return this.adsService.removeCompetitionGroup(id);
  }

  @Get()
  findAll(@Query() query: AdminAdsQueryDto) {
    return this.adsService.findAllForAdmin(query);
  }

  @Post()
  create(@Body() createAdDto: CreateAdDto, @Request() req) {
    return this.adsService.create(createAdDto, req.user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateAdDto: UpdateAdDto) {
    return this.adsService.update(id, updateAdDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateAdStatusDto: UpdateAdStatusDto,
  ) {
    return this.adsService.updateStatus(id, updateAdStatusDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adsService.remove(id);
  }
}
