import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../entities/match.entity';
import { Swipe } from '../entities/swipe.entity';
import { Conversation } from '../entities/conversation.entity';
import { Pet } from '../entities/pet.entity';
import { User } from '../entities/user.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { calculateDistance, parseLocation } from '../common/utils/distance.util';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Swipe)
    private swipeRepository: Repository<Swipe>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async swipe(createMatchDto: CreateMatchDto, petId1: string) {
    const { fk_pet_id_2, action } = createMatchDto;

    // Verificar se os pets existem
    const pet1 = await this.petRepository.findOne({
      where: { id: petId1 },
      relations: ['usuario'],
    });

    const pet2 = await this.petRepository.findOne({
      where: { id: fk_pet_id_2 },
      relations: ['usuario'],
    });

    if (!pet1 || !pet2) {
      throw new NotFoundException('Pet não encontrado');
    }

    // Não permitir swipe no próprio pet
    if (pet1.id === pet2.id) {
      throw new BadRequestException('Não é possível fazer swipe no próprio pet');
    }

    // Não permitir swipe em pets do mesmo usuário
    if (pet1.fk_usuario_id === pet2.fk_usuario_id) {
      throw new BadRequestException('Não é possível fazer swipe em pets do mesmo usuário');
    }

    // Verificar se já existe um swipe
    const existingSwipe = await this.swipeRepository.findOne({
      where: {
        fk_pet_id_1: petId1,
        fk_pet_id_2: fk_pet_id_2,
      },
    });

    if (existingSwipe) {
      throw new BadRequestException('Swipe já realizado para este pet');
    }

    // Criar o swipe
    const swipe = this.swipeRepository.create({
      fk_pet_id_1: petId1,
      fk_pet_id_2: fk_pet_id_2,
      action,
    });

    await this.swipeRepository.save(swipe);

    // Se foi um like, verificar se há match
    if (action === 'like') {
      const reciprocalSwipe = await this.swipeRepository.findOne({
        where: {
          fk_pet_id_1: fk_pet_id_2,
          fk_pet_id_2: petId1,
          action: 'like',
        },
      });

      if (reciprocalSwipe) {
        // Criar match
        const match = this.matchRepository.create({
          fk_pet_id_1: petId1,
          fk_pet_id_2: fk_pet_id_2,
          status: 'aceito',
        });

        const savedMatch = await this.matchRepository.save(match);

        // Criar conversa
        const conversation = this.conversationRepository.create({
          fk_match_id: savedMatch.id,
          fk_participante_1_id: pet1.fk_usuario_id,
          fk_participante_2_id: pet2.fk_usuario_id,
        });

        await this.conversationRepository.save(conversation);

        return {
          swipe,
          match: savedMatch,
          isMatch: true,
        };
      }
    }

    return {
      swipe,
      isMatch: false,
    };
  }

  async findUserMatches(userId: string) {
    const matches = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.pet1', 'pet1')
      .leftJoinAndSelect('match.pet2', 'pet2')
      .leftJoinAndSelect('pet1.usuario', 'usuario1')
      .leftJoinAndSelect('pet2.usuario', 'usuario2')
      .leftJoinAndSelect('match.conversa', 'conversa')
      .where('usuario1.id = :userId OR usuario2.id = :userId', { userId })
      .andWhere('match.status = :status', { status: 'aceito' })
      .getMany();

    return matches;
  }

  async findOne(id: string) {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['pet1', 'pet2', 'pet1.usuario', 'pet2.usuario', 'conversa'],
    });

    if (!match) {
      throw new NotFoundException('Match não encontrado');
    }

    return match;
  }

  async getPotentialMatches(petId: string, limit: number = 10): Promise<any[]> {
    // Buscar pets que ainda não receberam swipe do pet atual
    const swipedPetIds = await this.swipeRepository
      .createQueryBuilder('swipe')
      .select('swipe.fk_pet_id_2')
      .where('swipe.fk_pet_id_1 = :petId', { petId })
      .getRawMany();

    const excludeIds = swipedPetIds.map(s => s.fk_pet_id_2);
    excludeIds.push(petId); // Excluir o próprio pet

    const pet = await this.petRepository.findOne({
      where: { id: petId },
      relations: ['usuario'],
    });

    if (!pet) {
      throw new NotFoundException('Pet não encontrado');
    }

    // Buscar usuário dono do pet com localização
    const petOwner = await this.userRepository.findOne({
      where: { id: pet.fk_usuario_id },
    });

    if (!petOwner) {
      throw new NotFoundException('Dono do pet não encontrado');
    }

    // Parse localização do dono do pet
    const ownerLocation = parseLocation(petOwner.localizacao_geo);
    const maxRange = petOwner.raio_maximo || 20; // Default 20km

    let query = this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.usuario', 'usuario')
      .where('pet.fk_usuario_id != :userId', { userId: pet.fk_usuario_id })
      .andWhere('pet.especie = :especie', { especie: pet.especie })
      .andWhere('usuario.localizacao_geo IS NOT NULL'); // Apenas usuários com localização

    // Excluir pets que já receberam swipe (se houver algum)
    if (excludeIds.length > 1) {
      query = query.andWhere('pet.id NOT IN (:...excludeIds)', { excludeIds });
    }

    // Filtrar por gênero oposto para reprodução
    if (pet.genero === 'Macho') {
      query = query.andWhere('pet.genero = :genero', { genero: 'Fêmea' });
    } else if (pet.genero === 'Fêmea') {
      query = query.andWhere('pet.genero = :genero', { genero: 'Macho' });
    }

    const pets = await query.getMany();

    // Filtrar por distância se o dono do pet tiver localização
    let filteredPets = pets;
    if (ownerLocation) {
      filteredPets = pets.filter((p) => {
        const petUserLocation = parseLocation(p.usuario?.localizacao_geo);
        if (!petUserLocation) return false;

        const distance = calculateDistance(
          ownerLocation.latitude,
          ownerLocation.longitude,
          petUserLocation.latitude,
          petUserLocation.longitude,
        );

        return distance <= maxRange;
      });

      // Ordenar por distância (mais próximo primeiro)
      filteredPets.sort((a, b) => {
        const locA = parseLocation(a.usuario?.localizacao_geo);
        const locB = parseLocation(b.usuario?.localizacao_geo);
        if (!locA || !locB) return 0;

        const distA = calculateDistance(
          ownerLocation.latitude,
          ownerLocation.longitude,
          locA.latitude,
          locA.longitude,
        );
        const distB = calculateDistance(
          ownerLocation.latitude,
          ownerLocation.longitude,
          locB.latitude,
          locB.longitude,
        );
        return distA - distB;
      });
    }

    // Limitar resultados
    filteredPets = filteredPets.slice(0, limit);
    
    // Processar fotos e dados de saúde
    return filteredPets.map(p => {
      try {
        const petUserLocation = parseLocation(p.usuario?.localizacao_geo);
        let distance: number | null = null;
        if (ownerLocation && petUserLocation) {
          distance = calculateDistance(
            ownerLocation.latitude,
            ownerLocation.longitude,
            petUserLocation.latitude,
            petUserLocation.longitude,
          );
        }

        return {
          ...p,
          fotos: p.fotos ? JSON.parse(p.fotos) : [],
          dados_saude: p.dados_saude ? JSON.parse(p.dados_saude) : null,
          distancia_km: distance,
        } as any;
      } catch (error) {
        return {
          ...p,
          fotos: [],
          dados_saude: null,
          distancia_km: null,
        } as any;
      }
    });
  }
}

