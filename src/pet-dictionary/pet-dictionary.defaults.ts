import {
  DEFAULT_BREED_ALIAS_GROUPS,
  normalizeBreedText,
} from '../common/pets/breed-normalization.util';
import type { PetDictionaryCategory } from '../entities/pet-dictionary-entry.entity';

export type DefaultPetDictionaryEntry = {
  category: PetDictionaryCategory;
  canonicalKey: string;
  label: string;
  aliases: string[];
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
      canonicalKey,
      label: aliases[0] || canonicalKey,
      aliases: uniqueValues(aliases),
    }),
  ),
];
