import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly profilePhotosPath = path.join(
    process.cwd(),
    'public',
    'uploads',
    'profile-photos',
  );

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['pets'],
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);

    return this.userRepository.save(user);
  }

  async updateProfilePhoto(id: string, filename: string): Promise<User> {
    const user = await this.findOne(id);
    const previousPhotoUrl = user.foto_perfil_url;

    user.foto_perfil_url = `/api/users/profile-photo/${filename}`;
    const savedUser = await this.userRepository.save(user);

    await this.removeLocalProfilePhoto(previousPhotoUrl);

    return savedUser;
  }

  async removeProfilePhoto(id: string): Promise<User> {
    const user = await this.findOne(id);
    const previousPhotoUrl = user.foto_perfil_url;

    user.foto_perfil_url = null;
    const savedUser = await this.userRepository.save(user);

    await this.removeLocalProfilePhoto(previousPhotoUrl);

    return savedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.removeLocalProfilePhoto(user.foto_perfil_url);
    await this.userRepository.remove(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  getProfilePhotoPath(filename: string): string {
    const safeFilename = path.basename(filename);

    if (safeFilename !== filename) {
      throw new NotFoundException('Foto não encontrada');
    }

    return path.join(this.profilePhotosPath, safeFilename);
  }

  private async removeLocalProfilePhoto(photoUrl?: string | null) {
    if (!photoUrl?.startsWith('/api/users/profile-photo/')) {
      return;
    }

    const filename = photoUrl.split('/').pop();
    if (!filename) {
      return;
    }

    const filePath = this.getProfilePhotoPath(filename);

    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.error('Erro ao remover foto de perfil:', error);
      }
    }
  }
}
