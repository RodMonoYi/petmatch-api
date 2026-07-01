import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const profilePhotosPath = path.join(
  process.cwd(),
  'public',
  'uploads',
  'profile-photos',
);
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMe(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Post('me/profile-photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: {
        fileSize: 3 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!allowedImageTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Envie uma imagem JPG, PNG ou WebP'),
            false,
          );
        }

        callback(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          mkdirSync(profilePhotosPath, { recursive: true });
          callback(null, profilePhotosPath);
        },
        filename: (_req, file, callback) => {
          const extension = path.extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
    }),
  )
  uploadProfilePhoto(@Request() req, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Envie uma foto de perfil');
    }

    return this.usersService.updateProfilePhoto(req.user.id, file.filename);
  }

  @Delete('me/profile-photo')
  @UseGuards(JwtAuthGuard)
  removeProfilePhoto(@Request() req) {
    return this.usersService.removeProfilePhoto(req.user.id);
  }

  @Get('profile-photo/:filename')
  getProfilePhoto(@Param('filename') filename: string, @Res({ passthrough: true }) res) {
    const filePath = this.usersService.getProfilePhotoPath(filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Foto não encontrada');
    }

    const extension = path.extname(filename).toLowerCase();
    const contentType =
      extension === '.png'
        ? 'image/png'
        : extension === '.webp'
          ? 'image/webp'
          : 'image/jpeg';

    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return new StreamableFile(createReadStream(filePath));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  removeMe(@Request() req) {
    return this.usersService.remove(req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
