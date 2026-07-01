import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Pet } from '../entities/pet.entity';
import { SavedPet } from '../entities/saved-pet.entity';
import { Swipe } from '../entities/swipe.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { SearchPetsDto } from './dto/search-pets.dto';
import { calculateDistance, parseLocation } from '../common/utils/distance.util';

// Tipo de resposta com campos parseados
type PetResponse = Omit<Pet, 'fotos' | 'dados_saude'> & {
  fotos: string[];
  dados_saude: any;
  distancia_km?: number | null;
  curtidas_count: number;
  curtido: boolean;
  curtido_por_pet_ids: string[];
  salvo: boolean;
};

@Injectable()
export class PetsService {
  constructor(
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    @InjectRepository(SavedPet)
    private savedPetRepository: Repository<SavedPet>,
    @InjectRepository(Swipe)
    private swipeRepository: Repository<Swipe>,
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
      curtidas_count: 0,
      curtido: false,
      curtido_por_pet_ids: [],
      salvo: false,
    } as PetResponse;
  }

  private async enrichPetsWithUserState(
    pets: Array<PetResponse & { distancia_km?: number | null }>,
    userId?: string,
  ) {
    const petIds = pets.map((pet) => pet.id);
    if (petIds.length === 0) {
      return pets;
    }

    const likeCountsRaw = await this.swipeRepository
      .createQueryBuilder('swipe')
      .select('swipe.fk_pet_id_2', 'petId')
      .addSelect('COUNT(*)', 'count')
      .where('swipe.fk_pet_id_2 IN (:...petIds)', { petIds })
      .andWhere('swipe.action = :action', { action: 'like' })
      .groupBy('swipe.fk_pet_id_2')
      .getRawMany<{ petId: string; count: string }>();

    const likeCounts = new Map(
      likeCountsRaw.map((row) => [row.petId, Number(row.count)]),
    );
    const likedByPetIds = new Map<string, string[]>();
    const savedPetIds = new Set<string>();

    if (userId) {
      const [userPets, savedPets] = await Promise.all([
        this.petRepository.find({
          where: { fk_usuario_id: userId },
          select: ['id'],
        }),
        this.savedPetRepository.find({
          where: {
            fk_usuario_id: userId,
            fk_pet_id: In(petIds),
          },
          select: ['fk_pet_id'],
        }),
      ]);

      savedPets.forEach((savedPet) => savedPetIds.add(savedPet.fk_pet_id));

      const userPetIds = userPets.map((pet) => pet.id);
      if (userPetIds.length > 0) {
        const likedSwipes = await this.swipeRepository
          .createQueryBuilder('swipe')
          .select('swipe.fk_pet_id_2', 'petId')
          .addSelect('swipe.fk_pet_id_1', 'sourcePetId')
          .where('swipe.fk_pet_id_1 IN (:...userPetIds)', { userPetIds })
          .andWhere('swipe.fk_pet_id_2 IN (:...petIds)', { petIds })
          .andWhere('swipe.action = :action', { action: 'like' })
          .getRawMany<{ petId: string; sourcePetId: string }>();

        likedSwipes.forEach((swipe) => {
          const sourcePetIds = likedByPetIds.get(swipe.petId) || [];
          sourcePetIds.push(swipe.sourcePetId);
          likedByPetIds.set(swipe.petId, sourcePetIds);
        });
      }
    }

    return pets.map((pet) => ({
      ...pet,
      curtidas_count: likeCounts.get(pet.id) || 0,
      curtido_por_pet_ids: likedByPetIds.get(pet.id) || [],
      curtido: (likedByPetIds.get(pet.id) || []).length > 0,
      salvo: savedPetIds.has(pet.id),
    }));
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
    
    const [petWithState] = await this.enrichPetsWithUserState(
      [this.transformPet(savedPet)],
      userId,
    );

    return petWithState;
  }

  async findAll(searchDto: SearchPetsDto, userId?: string) {
    const {
      page = 1,
      limit = 10,
      latitude,
      longitude,
      raio,
      idade_min,
      idade_max,
      pedigree,
      vacinado,
      disponivel_reproducao,
      aceita_viagem,
      ...filters
    } = searchDto;
    const skip = (page - 1) * limit;

    let query = this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.usuario', 'usuario');

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

    if (typeof pedigree === 'boolean') {
      query = query.andWhere('pet.pedigree = :pedigree', { pedigree });
    }

    if (typeof disponivel_reproducao === 'boolean') {
      query = query.andWhere('pet.disponivel_reproducao = :disponivel_reproducao', {
        disponivel_reproducao,
      });
    }

    if (typeof aceita_viagem === 'boolean') {
      query = query.andWhere('pet.aceita_viagem = :aceita_viagem', { aceita_viagem });
    }

    if (typeof vacinado === 'boolean') {
      query = query.andWhere('pet.dados_saude LIKE :vacinado', {
        vacinado: `%"vacinado":${vacinado}%`,
      });
    }

    const now = new Date();
    if (typeof idade_min === 'number') {
      const maxBirthDate = new Date(now);
      maxBirthDate.setFullYear(maxBirthDate.getFullYear() - idade_min);
      query = query.andWhere('pet.data_nascimento <= :maxBirthDate', {
        maxBirthDate: maxBirthDate.toISOString().split('T')[0],
      });
    }

    if (typeof idade_max === 'number') {
      const minBirthDate = new Date(now);
      minBirthDate.setFullYear(minBirthDate.getFullYear() - idade_max - 1);
      query = query.andWhere('pet.data_nascimento >= :minBirthDate', {
        minBirthDate: minBirthDate.toISOString().split('T')[0],
      });
    }

    let pets = await query.getMany();

    const hasDistanceFilter =
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      typeof raio === 'number';

    const petsWithDistance = pets
      .map((pet) => {
        let distancia_km: number | null = null;
        const petLocation = parseLocation(pet.usuario?.localizacao_geo);

        if (typeof latitude === 'number' && typeof longitude === 'number' && petLocation) {
          distancia_km = calculateDistance(
            latitude,
            longitude,
            petLocation.latitude,
            petLocation.longitude,
          );
        }

        return { pet, distancia_km };
      })
      .filter(({ distancia_km }) => {
        if (!hasDistanceFilter) return true;
        return distancia_km !== null && distancia_km <= raio;
      })
      .sort((a, b) => {
        if (a.distancia_km === null || b.distancia_km === null) return 0;
        return a.distancia_km - b.distancia_km;
      });

    const total = petsWithDistance.length;
    const paginatedPets = petsWithDistance.slice(skip, skip + limit);

    const transformedPets = paginatedPets.map(({ pet, distancia_km }) => ({
        ...this.transformPet(pet),
        distancia_km,
      }));

    return {
      pets: await this.enrichPetsWithUserState(transformedPets, userId),
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

    return this.enrichPetsWithUserState(
      pets.map((pet) => this.transformPet(pet)),
      userId,
    );
  }

  async findOne(id: string, userId?: string): Promise<PetResponse> {
    const pet = await this.petRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });

    if (!pet) {
      throw new NotFoundException('Pet não encontrado');
    }

    const [petWithState] = await this.enrichPetsWithUserState(
      [this.transformPet(pet)],
      userId,
    );

    return petWithState;
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

    const [petWithState] = await this.enrichPetsWithUserState(
      [this.transformPet(updatedPet)],
      userId,
    );

    return petWithState;
  }

  async findSaved(userId: string): Promise<PetResponse[]> {
    const savedPets = await this.savedPetRepository.find({
      where: { fk_usuario_id: userId },
      relations: ['pet', 'pet.usuario'],
      order: { criado_em: 'DESC' },
    });

    return this.enrichPetsWithUserState(
      savedPets.map((savedPet) => this.transformPet(savedPet.pet)),
      userId,
    );
  }

  async savePet(petId: string, userId: string) {
    const pet = await this.petRepository.findOne({
      where: { id: petId },
      select: ['id', 'fk_usuario_id'],
    });

    if (!pet) {
      throw new NotFoundException('Pet não encontrado');
    }

    if (pet.fk_usuario_id === userId) {
      throw new BadRequestException('Não é possível salvar seu próprio pet');
    }

    const existingSavedPet = await this.savedPetRepository.findOne({
      where: {
        fk_usuario_id: userId,
        fk_pet_id: petId,
      },
    });

    if (!existingSavedPet) {
      await this.savedPetRepository.save(
        this.savedPetRepository.create({
          fk_usuario_id: userId,
          fk_pet_id: petId,
        }),
      );
    }

    return {
      petId,
      salvo: true,
    };
  }

  async unsavePet(petId: string, userId: string) {
    await this.savedPetRepository.delete({
      fk_usuario_id: userId,
      fk_pet_id: petId,
    });

    return {
      petId,
      salvo: false,
    };
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
