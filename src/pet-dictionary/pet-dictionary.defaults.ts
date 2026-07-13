import {
  DEFAULT_BREED_ALIAS_GROUPS,
  normalizeBreedText,
} from '../common/pets/breed-normalization.util';
import type { PetDictionaryCategory } from '../entities/pet-dictionary-entry.entity';

export type DefaultPetDictionaryEntry = {
  category: PetDictionaryCategory;
  speciesCanonicalKey?: string | null;
  canonicalKey: string;
  label: string;
  aliases: string[];
};

const DOG_BREED_KEYS = [
  'srd',
  'akita',
  'beagle',
  'border collie',
  'boxer',
  'bulldog frances',
  'bulldog ingles',
  'cane corso',
  'chihuahua',
  'chow chow',
  'cocker',
  'salsicha',
  'dalmata',
  'dobermann',
  'fila brasileiro',
  'golden retriever',
  'husky siberiano',
  'labrador retriever',
  'lhasa apso',
  'maltes',
  'pastor alemao',
  'pinscher',
  'pit bull',
  'poodle',
  'pug',
  'rottweiler',
  'schnauzer',
  'shih tzu',
  'spitz alemao',
  'weimaraner',
  'yorkshire',
];

const CAT_BREED_KEYS = [
  'angora',
  'bengal',
  'british shorthair',
  'exotic shorthair',
  'maine coon',
  'persa',
  'ragdoll',
  'siames',
  'sphynx',
];

export const DEFAULT_BREED_SPECIES_BY_KEY: Record<string, string> = {
  ...Object.fromEntries(DOG_BREED_KEYS.map((key) => [key, 'cao'])),
  ...Object.fromEntries(CAT_BREED_KEYS.map((key) => [key, 'gato'])),
};

const uniqueValues = (values: string[]) => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalizeBreedText(value);
    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
};

export const DEFAULT_SPECIES_ALIAS_GROUPS: Record<
  string,
  { label: string; aliases: string[] }
> = {
  cao: {
    label: 'Cão',
    aliases: ['Cão', 'Cao', 'Cachorro', 'Canino'],
  },
  gato: {
    label: 'Gato',
    aliases: ['Gato', 'Felino'],
  },
  passaro: {
    label: 'Pássaro',
    aliases: ['Pássaro', 'Passaro', 'Ave', 'Passarinho'],
  },
  coelho: {
    label: 'Coelho',
    aliases: ['Coelho'],
  },
  outro: {
    label: 'Outro',
    aliases: ['Outro'],
  },
};

export const DEFAULT_PET_DICTIONARY_ENTRIES: DefaultPetDictionaryEntry[] = [
  ...Object.entries(DEFAULT_SPECIES_ALIAS_GROUPS).map(
    ([canonicalKey, species]) => ({
      category: 'species' as const,
      canonicalKey,
      label: species.label,
      aliases: uniqueValues(species.aliases),
    }),
  ),
  ...Object.entries(DEFAULT_BREED_ALIAS_GROUPS).map(
    ([canonicalKey, aliases]) => ({
      category: 'breed' as const,
      speciesCanonicalKey: DEFAULT_BREED_SPECIES_BY_KEY[canonicalKey] || null,
      canonicalKey,
      label: aliases[0] || canonicalKey,
      aliases: uniqueValues(aliases),
    }),
  ),
  {
    category: 'breed',
    speciesCanonicalKey: 'gato',
    canonicalKey: 'srd',
    label: 'SRD',
    aliases: uniqueValues(DEFAULT_BREED_ALIAS_GROUPS.srd || ['SRD']),
  },
];
