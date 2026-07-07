import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../entities/match.entity';
import { Swipe } from '../entities/swipe.entity';
import { Conversation } from '../entities/conversation.entity';
import { Pet } from '../entities/pet.entity';
import { User } from '../entities/user.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { calculateDistance, parseLocation } from '../common/utils/distance.util';
import { NotificationsService } from '../notifications/notifications.service';
import {
  areBreedKeysCompatible,
  getBreedComparisonKey,
} from '../common/pets/breed-normalization.util';
import { serializeUserForResponse } from '../common/users/user-response.util';

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
    private notificationsService: NotificationsService,
  ) {}

  private safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
    if (!jsonString) return defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return defaultValue;
    }
  }

  private transformPet(pet: Pet): any {
    return {
      ...pet,
      usuario: serializeUserForResponse(pet.usuario),
      raca_normalizada: getBreedComparisonKey(pet.raca, pet.raca_normalizada),
      fotos: this.safeJsonParse(pet.fotos, []),
      dados_saude: this.safeJsonParse(pet.dados_saude, null),
    };
  }

  private transformMatch(match: Match): any {
    return {
      ...match,
      pet1: match.pet1 ? this.transformPet(match.pet1) : match.pet1,
      pet2: match.pet2 ? this.transformPet(match.pet2) : match.pet2,
    };
  }

  private validatePetCompatibility(pet1: Pet, pet2: Pet) {
    if (pet1.especie !== pet2.especie) {
      throw new BadRequestException('Pets de espécies diferentes não podem dar match');
    }

    if (pet1.genero === pet2.genero) {
      throw new BadRequestException('Para reprodução, os pets precisam ter gêneros opostos');
    }

    const pet1BreedKey = getBreedComparisonKey(pet1.raca, pet1.raca_normalizada);
    const pet2BreedKey = getBreedComparisonKey(pet2.raca, pet2.raca_normalizada);
    if (!areBreedKeysCompatible(pet1BreedKey, pet2BreedKey)) {
      throw new BadRequestException('Pets de raças diferentes não podem dar match');
    }
  }

  async swipe(createMatchDto: CreateMatchDto, petId1: string, userId: string) {
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

    if (!pet1.ativo || !pet2.ativo) {
      throw new BadRequestException('Pets inativos não podem iniciar novas interações');
    }

    if (pet1.fk_usuario_id !== userId) {
      throw new ForbiddenException('Você só pode fazer swipe com seus próprios pets');
    }

    // Não permitir swipe no próprio pet
    if (pet1.id === pet2.id) {
      throw new BadRequestException('Não é possível fazer swipe no próprio pet');
    }

    // Não permitir swipe em pets do mesmo usuário
    if (pet1.fk_usuario_id === pet2.fk_usuario_id) {
      throw new BadRequestException('Não é possível fazer swipe em pets do mesmo usuário');
    }

    this.validatePetCompatibility(pet1, pet2);

    // Verificar se já existe um swipe
    const existingSwipe = await this.swipeRepository.findOne({
      where: {
        fk_pet_id_1: petId1,
        fk_pet_id_2: fk_pet_id_2,
      },
    });

    if (existingSwipe) {
      const existingMatch = await this.matchRepository
        .createQueryBuilder('match')
        .where(
          '(match.fk_pet_id_1 = :petId1 AND match.fk_pet_id_2 = :petId2) OR (match.fk_pet_id_1 = :petId2 AND match.fk_pet_id_2 = :petId1)',
          { petId1, petId2: fk_pet_id_2 },
        )
        .getOne();

      return {
        swipe: existingSwipe,
        match: existingMatch || undefined,
        isMatch: Boolean(existingMatch),
        alreadySwiped: true,
      };
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
        const existingMatch = await this.matchRepository
          .createQueryBuilder('match')
          .where(
            '(match.fk_pet_id_1 = :petId1 AND match.fk_pet_id_2 = :petId2) OR (match.fk_pet_id_1 = :petId2 AND match.fk_pet_id_2 = :petId1)',
            { petId1, petId2: fk_pet_id_2 },
          )
          .getOne();

        if (existingMatch) {
          return {
            swipe,
            match: existingMatch,
            isMatch: true,
          };
        }

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

        const savedConversation =
          await this.conversationRepository.save(conversation);

        await Promise.all([
          this.notificationsService.create({
            userId: pet1.fk_usuario_id,
            tipo: 'match',
            titulo: 'Novo match',
            mensagem: `${pet1.nome} e ${pet2.nome} deram match.`,
            dados: {
              matchId: savedMatch.id,
              conversationId: savedConversation.id,
              petId: pet2.id,
              sourcePetId: pet2.id,
            },
          }),
          this.notificationsService.create({
            userId: pet2.fk_usuario_id,
            tipo: 'match',
            titulo: 'Novo match',
            mensagem: `${pet2.nome} e ${pet1.nome} deram match.`,
            dados: {
              matchId: savedMatch.id,
              conversationId: savedConversation.id,
              petId: pet1.id,
              sourcePetId: pet1.id,
            },
          }),
        ]);

        return {
          swipe,
          match: savedMatch,
          isMatch: true,
        };
      }

      await this.notificationsService.create({
        userId: pet2.fk_usuario_id,
        tipo: 'like',
        titulo: 'Novo interesse',
        mensagem: `${pet1.nome} curtiu ${pet2.nome}.`,
        dados: {
          sourcePetId: pet1.id,
          targetPetId: pet2.id,
        },
      });
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

    return matches.map((match) => this.transformMatch(match));
  }

  async findUserStats(userId: string) {
    const userPets = await this.petRepository.find({
      where: { fk_usuario_id: userId },
      select: ['id'],
    });
    const petIds = userPets.map((pet) => pet.id);

    if (petIds.length === 0) {
      return {
        swipes: 0,
        likes: 0,
        matches: 0,
      };
    }

    const [swipes, likes, matches] = await Promise.all([
      this.swipeRepository
        .createQueryBuilder('swipe')
        .where('swipe.fk_pet_id_1 IN (:...petIds)', { petIds })
        .getCount(),
      this.swipeRepository
        .createQueryBuilder('swipe')
        .where('swipe.fk_pet_id_1 IN (:...petIds)', { petIds })
        .andWhere('swipe.action = :action', { action: 'like' })
        .getCount(),
      this.matchRepository
        .createQueryBuilder('match')
        .where(
          '(match.fk_pet_id_1 IN (:...petIds) OR match.fk_pet_id_2 IN (:...petIds))',
          { petIds },
        )
        .andWhere('match.status = :status', { status: 'aceito' })
        .getCount(),
    ]);

    return {
      swipes,
      likes,
      matches,
    };
  }

  async findOne(id: string, userId: string) {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['pet1', 'pet2', 'pet1.usuario', 'pet2.usuario', 'conversa'],
    });

    if (!match) {
      throw new NotFoundException('Match não encontrado');
    }

    if (
      match.pet1?.fk_usuario_id !== userId &&
      match.pet2?.fk_usuario_id !== userId
    ) {
      throw new ForbiddenException('Você não tem permissão para ver este match');
    }

    return this.transformMatch(match);
  }

  async getPotentialMatches(
    petId: string,
    limit: number = 10,
    userId: string,
  ): Promise<any[]> {
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

    if (!pet.ativo) {
      throw new BadRequestException('Pets inativos não aparecem em novas buscas de match');
    }

    if (pet.fk_usuario_id !== userId) {
      throw new ForbiddenException('Você só pode buscar matches para seus próprios pets');
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
    const sourceBreedKey = getBreedComparisonKey(pet.raca, pet.raca_normalizada);

    let query = this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.usuario', 'usuario')
      .where('pet.fk_usuario_id != :userId', { userId: pet.fk_usuario_id })
      .andWhere('pet.ativo = :ativo', { ativo: true })
      .andWhere('pet.especie = :especie', { especie: pet.especie })
      .andWhere('usuario.localizacao_geo IS NOT NULL'); // Apenas usuários com localização

    if (sourceBreedKey) {
      query = query.andWhere(
        '(pet.raca_normalizada = :racaNormalizada OR pet.raca_normalizada IS NULL OR pet.raca_normalizada = :emptyBreed)',
        { racaNormalizada: sourceBreedKey, emptyBreed: '' },
      );
    }

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

    const pets = (await query.getMany()).filter((candidatePet) => (
      areBreedKeysCompatible(
        sourceBreedKey,
        getBreedComparisonKey(candidatePet.raca, candidatePet.raca_normalizada),
      )
    ));

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
    const parsedLimit = Number(limit) || 10;
    filteredPets = filteredPets.slice(0, parsedLimit);
    
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
          usuario: serializeUserForResponse(p.usuario),
          fotos: p.fotos ? JSON.parse(p.fotos) : [],
          dados_saude: p.dados_saude ? JSON.parse(p.dados_saude) : null,
          distancia_km: distance,
        } as any;
      } catch (error) {
        return {
          ...p,
          usuario: serializeUserForResponse(p.usuario),
          fotos: [],
          dados_saude: null,
          distancia_km: null,
        } as any;
      }
    });
  }
}
