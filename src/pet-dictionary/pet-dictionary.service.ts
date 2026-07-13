import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeBreedText } from '../common/pets/breed-normalization.util';
import {
  PetDictionaryEntry,
  PetDictionaryCategory,
} from '../entities/pet-dictionary-entry.entity';
import { Pet } from '../entities/pet.entity';
import { CreatePetDictionaryEntryDto } from './dto/create-pet-dictionary-entry.dto';
import { UpdatePetDictionaryEntryDto } from './dto/update-pet-dictionary-entry.dto';
import { DEFAULT_PET_DICTIONARY_ENTRIES } from './pet-dictionary.defaults';

type DictionaryIndex = Record<string, string>;

type NormalizedEntryPayload = {
  category: PetDictionaryCategory;
  speciesCanonicalKey: string | null;
  label: string;
  canonicalKey: string;
  aliases: string[];
  active: boolean;
};

@Injectable()
export class PetDictionaryService implements OnModuleInit {
  private readonly indexCache = new Map<string, DictionaryIndex>();

  constructor(
    @InjectRepository(PetDictionaryEntry)
    private dictionaryRepository: Repository<PetDictionaryEntry>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultsIfEmpty();
  }

  normalizeText(value?: string | null): string {
    return normalizeBreedText(value);
  }

  async list(category?: PetDictionaryCategory, speciesCanonicalKey?: string) {
    const where = this.buildListWhere(category, speciesCanonicalKey);

    return this.dictionaryRepository.find({
      where,
      order: {
        category: 'ASC',
        speciesCanonicalKey: 'ASC',
        label: 'ASC',
      },
    });
  }

  async listActive(category?: PetDictionaryCategory, speciesCanonicalKey?: string) {
    const where = this.buildListWhere(category, speciesCanonicalKey, true);

    return this.dictionaryRepository.find({
      where,
      order: {
        category: 'ASC',
        speciesCanonicalKey: 'ASC',
        label: 'ASC',
      },
    });
  }

  async create(dto: CreatePetDictionaryEntryDto) {
    const payload = this.normalizePayload(dto);
    await this.ensureLinkedSpeciesExists(payload);
    await this.ensureNoCollisions(payload);

    const entry = await this.dictionaryRepository.save(
      this.dictionaryRepository.create(payload),
    );

    await this.afterDictionaryChange(entry.category);
    return entry;
  }

  async update(id: string, dto: UpdatePetDictionaryEntryDto) {
    const entry = await this.findEntryOrFail(id);
    const previousCanonicalKey = entry.canonicalKey;
    const payload = this.normalizePayload({
      category: entry.category,
      speciesCanonicalKey:
        dto.speciesCanonicalKey ?? entry.speciesCanonicalKey ?? undefined,
      label: dto.label ?? entry.label,
      canonicalKey: dto.canonicalKey ?? entry.canonicalKey,
      aliases: dto.aliases ?? entry.aliases,
      active: dto.active ?? entry.active,
    });

    await this.ensureLinkedSpeciesExists(payload);
    await this.ensureNoCollisions(payload, id);
    Object.assign(entry, payload);

    const savedEntry = await this.dictionaryRepository.save(entry);
    if (
      savedEntry.category === 'species' &&
      previousCanonicalKey !== savedEntry.canonicalKey
    ) {
      await this.dictionaryRepository.update(
        { category: 'breed', speciesCanonicalKey: previousCanonicalKey },
        { speciesCanonicalKey: savedEntry.canonicalKey },
      );
    }

    await this.afterDictionaryChange(savedEntry.category);
    return savedEntry;
  }

  async remove(id: string) {
    const entry = await this.findEntryOrFail(id);
    if (entry.category === 'species') {
      const linkedBreedsCount = await this.dictionaryRepository.count({
        where: {
          category: 'breed',
          speciesCanonicalKey: entry.canonicalKey,
        },
      });

      if (linkedBreedsCount > 0) {
        throw new BadRequestException(
          'Não é possível excluir uma espécie com raças vinculadas.',
        );
      }
    }

    await this.dictionaryRepository.remove(entry);
    await this.afterDictionaryChange(entry.category);

    return { id };
  }

  async rebuildPetKeys() {
    await this.rebuildPetsForCategory('species');
    await this.rebuildPetsForCategory('breed');
    return { rebuilt: true };
  }

  async getCanonicalKey(
    category: PetDictionaryCategory,
    value?: string | null,
    speciesCanonicalKey?: string | null,
  ): Promise<string> {
    const normalizedValue = this.normalizeText(value);
    if (!normalizedValue) return '';

    const index = await this.getIndex(category, speciesCanonicalKey);
    return index[normalizedValue] ?? normalizedValue;
  }

  async getBreedComparisonKey(
    breed?: string | null,
    storedNormalizedBreed?: string | null,
    speciesCanonicalKey?: string | null,
  ): Promise<string> {
    const storedBreedKey = await this.getCanonicalKey(
      'breed',
      storedNormalizedBreed,
      speciesCanonicalKey,
    );
    return storedBreedKey || this.getCanonicalKey('breed', breed, speciesCanonicalKey);
  }

  async getSpeciesComparisonKey(
    species?: string | null,
    storedNormalizedSpecies?: string | null,
  ): Promise<string> {
    const storedSpeciesKey = await this.getCanonicalKey(
      'species',
      storedNormalizedSpecies,
    );
    return storedSpeciesKey || this.getCanonicalKey('species', species);
  }

  private async seedDefaultsIfEmpty() {
    const entriesCount = await this.dictionaryRepository.count();
    if (entriesCount > 0) {
      return;
    }

    await this.dictionaryRepository.save(
      DEFAULT_PET_DICTIONARY_ENTRIES.map((entry) =>
        this.dictionaryRepository.create({
          ...entry,
          speciesCanonicalKey: entry.speciesCanonicalKey ?? null,
          active: true,
        }),
      ),
    );

    this.indexCache.clear();
    await this.rebuildPetKeys();
  }

  private async findEntryOrFail(id: string) {
    const entry = await this.dictionaryRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Entrada do dicionário não encontrada');
    }

    return entry;
  }

  private normalizePayload(
    dto:
      | CreatePetDictionaryEntryDto
      | (UpdatePetDictionaryEntryDto & { category: PetDictionaryCategory }),
  ): NormalizedEntryPayload {
    const label = dto.label?.trim();
    const canonicalKey = this.normalizeText(dto.canonicalKey || label);
    const speciesCanonicalKey =
      dto.category === 'breed'
        ? this.normalizeText(dto.speciesCanonicalKey)
        : null;

    if (!label) {
      throw new BadRequestException('Informe o nome principal');
    }

    if (!canonicalKey) {
      throw new BadRequestException('Informe uma chave canônica válida');
    }

    if (dto.category === 'breed' && !speciesCanonicalKey) {
      throw new BadRequestException('Selecione a espécie desta raça');
    }

    return {
      category: dto.category,
      speciesCanonicalKey,
      label,
      canonicalKey,
      aliases: this.normalizeAliases(dto.aliases || [], label, canonicalKey),
      active: dto.active ?? true,
    };
  }

  private buildListWhere(
    category?: PetDictionaryCategory,
    speciesCanonicalKey?: string,
    active?: boolean,
  ) {
    const where: {
      category?: PetDictionaryCategory;
      speciesCanonicalKey?: string;
      active?: boolean;
    } = {};

    if (category) {
      where.category = category;
    }

    if (category === 'breed' && speciesCanonicalKey) {
      where.speciesCanonicalKey = this.normalizeText(speciesCanonicalKey);
    }

    if (active !== undefined) {
      where.active = active;
    }

    return where;
  }

  private async ensureLinkedSpeciesExists(payload: NormalizedEntryPayload) {
    if (payload.category !== 'breed') {
      return;
    }

    const species = await this.dictionaryRepository.findOne({
      where: {
        category: 'species',
        canonicalKey: payload.speciesCanonicalKey || '',
      },
    });

    if (!species) {
      throw new BadRequestException('Espécie vinculada não encontrada');
    }
  }

  private normalizeAliases(
    aliases: string[],
    label: string,
    canonicalKey: string,
  ) {
    const seen = new Set<string>([
      this.normalizeText(label),
      this.normalizeText(canonicalKey),
    ]);

    return aliases
      .map((alias) => alias.trim())
      .filter((alias) => {
        const normalizedAlias = this.normalizeText(alias);
        if (!normalizedAlias || seen.has(normalizedAlias)) {
          return false;
        }

        seen.add(normalizedAlias);
        return true;
      });
  }

  private async ensureNoCollisions(
    payload: NormalizedEntryPayload,
    currentEntryId?: string,
  ) {
    const query = this.dictionaryRepository
      .createQueryBuilder('entry')
      .where('entry.category = :category', { category: payload.category });

    if (payload.category === 'breed') {
      query.andWhere('entry.speciesCanonicalKey = :speciesCanonicalKey', {
        speciesCanonicalKey: payload.speciesCanonicalKey,
      });
    }

    if (currentEntryId) {
      query.andWhere('entry.id != :currentEntryId', { currentEntryId });
    }

    const existingEntries = await query.getMany();
    const requestedTerms = this.getEntryTerms(payload);

    existingEntries.forEach((entry) => {
      const existingTerms = this.getEntryTerms(entry);
      const conflictingTerm = requestedTerms.find((term) =>
        existingTerms.includes(term),
      );

      if (conflictingTerm) {
        throw new ConflictException(
          `O termo "${conflictingTerm}" já está em uso por "${entry.label}".`,
        );
      }
    });
  }

  private getEntryTerms(
    entry: Pick<PetDictionaryEntry, 'canonicalKey' | 'label' | 'aliases'>,
  ) {
    return [entry.canonicalKey, entry.label, ...(entry.aliases || [])]
      .map((value) => this.normalizeText(value))
      .filter(Boolean);
  }

  private getIndexCacheKey(
    category: PetDictionaryCategory,
    speciesCanonicalKey?: string | null,
  ) {
    return `${category}:${category === 'breed' ? speciesCanonicalKey || 'all' : 'all'}`;
  }

  private async getIndex(
    category: PetDictionaryCategory,
    speciesCanonicalKey?: string | null,
  ) {
    const normalizedSpeciesKey =
      category === 'breed' && speciesCanonicalKey
        ? this.normalizeText(speciesCanonicalKey)
        : undefined;
    const cacheKey = this.getIndexCacheKey(category, normalizedSpeciesKey);
    const cachedIndex = this.indexCache.get(cacheKey);
    if (cachedIndex) {
      return cachedIndex;
    }

    const entries = await this.listActive(category, normalizedSpeciesKey);
    const index = entries.reduce<DictionaryIndex>((aliases, entry) => {
      this.getEntryTerms(entry).forEach((term) => {
        aliases[term] = entry.canonicalKey;
      });
      return aliases;
    }, {});

    this.indexCache.set(cacheKey, index);
    return index;
  }

  private async afterDictionaryChange(category: PetDictionaryCategory) {
    this.indexCache.clear();
    await this.rebuildPetsForCategory(category);

    if (category === 'species') {
      await this.rebuildPetsForCategory('breed');
    }
  }

  private async rebuildPetsForCategory(category: PetDictionaryCategory) {
    const pets = await this.petRepository.find();
    const changedPets: Pet[] = [];

    for (const pet of pets) {
      if (category === 'species') {
        const nextSpeciesKey = await this.getCanonicalKey(
          'species',
          pet.especie,
        );
        if (pet.especie_normalizada !== nextSpeciesKey) {
          pet.especie_normalizada = nextSpeciesKey;
          changedPets.push(pet);
        }
      }

      if (category === 'breed') {
        const speciesKey = await this.getCanonicalKey(
          'species',
          pet.especie_normalizada || pet.especie,
        );
        const nextBreedKey = await this.getCanonicalKey(
          'breed',
          pet.raca,
          speciesKey,
        );
        if (pet.raca_normalizada !== nextBreedKey) {
          pet.raca_normalizada = nextBreedKey;
          changedPets.push(pet);
        }
      }
    }

    if (changedPets.length > 0) {
      await this.petRepository.save(changedPets);
    }
  }
}
