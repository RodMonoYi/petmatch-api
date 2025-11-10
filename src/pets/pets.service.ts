import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from '../entities/pet.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { SearchPetsDto } from './dto/search-pets.dto';

// Tipo de resposta com campos parseados
type PetResponse = Omit<Pet, 'fotos' | 'dados_saude'> & {
  fotos: string[];
  dados_saude: any;
};

@Injectable()
export class PetsService {
  constructor(
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
  ) {}

  private safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
    if (!jsonString) return defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return defaultValue;
    }
  }

  private transformPet(pet: Pet): PetResponse {
    return {
      ...pet,
      fotos: this.safeJsonParse(pet.fotos, []),
      dados_saude: this.safeJsonParse(pet.dados_saude, null),
    } as PetResponse;
  }

  async create(createPetDto: CreatePetDto, userId: string): Promise<PetResponse> {
    const petData = {
      ...createPetDto,
      fk_usuario_id: userId,
      fotos: createPetDto.fotos ? JSON.stringify(createPetDto.fotos) : undefined,
      dados_saude: createPetDto.dados_saude ? JSON.stringify(createPetDto.dados_saude) : undefined,
    };

    const pet = this.petRepository.create(petData);
    const savedPet = await this.petRepository.save(pet);
    
    return this.transformPet(savedPet);
  }

  async findAll(searchDto: SearchPetsDto) {
    const { page = 1, limit = 10, latitude, longitude, raio, ...filters } = searchDto;
    const skip = (page - 1) * limit;

    let query = this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.usuario', 'usuario')
      .skip(skip)
      .take(limit);

    // Aplicar filtros
    if (filters.especie) {
      query = query.andWhere('pet.especie = :especie', { especie: filters.especie });
    }

    if (filters.raca) {
      query = query.andWhere('pet.raca = :raca', { raca: filters.raca });
    }

    if (filters.genero) {
      query = query.andWhere('pet.genero = :genero', { genero: filters.genero });
    }

    if (filters.porte) {
      query = query.andWhere('pet.porte = :porte', { porte: filters.porte });
    }

    const [pets, total] = await query.getManyAndCount();

    return {
      pets: pets.map(pet => this.transformPet(pet)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findMyPets(userId: string): Promise<PetResponse[]> {
    const pets = await this.petRepository.find({
      where: { fk_usuario_id: userId },
      relations: ['usuario'],
    });

    return pets.map(pet => this.transformPet(pet));
  }

  async findOne(id: string): Promise<PetResponse> {
    const pet = await this.petRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });

    if (!pet) {
      throw new NotFoundException('Pet não encontrado');
    }

    return this.transformPet(pet);
  }

  async update(id: string, updatePetDto: UpdatePetDto, userId: string): Promise<PetResponse> {
    const pet = await this.petRepository.findOne({
      where: { id },
    });

    if (!pet) {
      throw new NotFoundException('Pet não encontrado');
    }

    if (pet.fk_usuario_id !== userId) {
      throw new ForbiddenException('Você não tem permissão para editar este pet');
    }

    const updateData = {
      ...updatePetDto,
      fotos: updatePetDto.fotos ? JSON.stringify(updatePetDto.fotos) : pet.fotos,
      dados_saude: updatePetDto.dados_saude ? JSON.stringify(updatePetDto.dados_saude) : pet.dados_saude,
    };

    Object.assign(pet, updateData);
    const updatedPet = await this.petRepository.save(pet);

    return this.transformPet(updatedPet);
  }

  async remove(id: string, userId: string): Promise<void> {
    const pet = await this.petRepository.findOne({
      where: { id },
    });

    if (!pet) {
      throw new NotFoundException('Pet não encontrado');
    }

    if (pet.fk_usuario_id !== userId) {
      throw new ForbiddenException('Você não tem permissão para excluir este pet');
    }

    await this.petRepository.remove(pet);
  }
}

