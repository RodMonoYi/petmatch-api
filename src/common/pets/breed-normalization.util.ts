export const DEFAULT_BREED_ALIAS_GROUPS: Record<string, string[]> = {
  srd: [
    'SRD',
    'Sem raça definida',
    'Sem raca definida',
    'Mestiço',
    'Mestico',
    'Vira-lata',
    'Vira lata',
    'Viralata',
    'Mixed breed',
  ],
  akita: ['Akita', 'Akita Inu'],
  beagle: ['Beagle'],
  'border collie': ['Border Collie'],
  boxer: ['Boxer'],
  'bulldog frances': ['Bulldog Francês', 'Bulldog Frances', 'French Bulldog'],
  'bulldog ingles': ['Bulldog Inglês', 'Bulldog Ingles', 'English Bulldog'],
  'cane corso': ['Cane Corso'],
  chihuahua: ['Chihuahua'],
  'chow chow': ['Chow Chow', 'Chowchow', 'Chow-Chow', 'show show'],
  cocker: ['Cocker', 'Cocker Spaniel'],
  salsicha: ['Dachshund', 'Teckel', 'Salsicha', 'Dachshund'],
  dalmata: ['Dálmata', 'Dalmata', 'Dalmatian'],
  dobermann: ['Dobermann', 'Doberman'],
  'fila brasileiro': ['Fila Brasileiro'],
  'golden retriever': ['Golden Retriever', 'Golden'],
  'husky siberiano': ['Husky Siberiano', 'Siberian Husky', 'Husky'],
  'labrador retriever': ['Labrador Retriever', 'Labrador'],
  'lhasa apso': ['Lhasa Apso'],
  maltes: ['Maltês', 'Maltes', 'Maltese'],
  'pastor alemao': ['Pastor Alemão', 'Pastor Alemao', 'German Shepherd'],
  pinscher: ['Pinscher'],
  'pit bull': ['Pit Bull', 'Pitbull', 'American Pit Bull Terrier'],
  poodle: ['Poodle'],
  pug: ['Pug'],
  rottweiler: ['Rottweiler'],
  schnauzer: ['Schnauzer'],
  'shih tzu': ['Shih Tzu', 'Shihtzu', 'Shitzu', 'Shih-tzu'],
  'spitz alemao': ['Spitz Alemão', 'Spitz Alemao', 'Lulu da Pomerânia', 'Lulu da Pomerania'],
  weimaraner: ['Weimaraner'],
  yorkshire: ['Yorkshire', 'Yorkshire Terrier'],
  angora: ['Angorá', 'Angora'],
  bengal: ['Bengal', 'Bengala'],
  'british shorthair': ['British Shorthair'],
  'exotic shorthair': ['Exotic Shorthair'],
  'maine coon': ['Maine Coon'],
  persa: ['Persa', 'Persian'],
  ragdoll: ['Ragdoll'],
  siames: ['Siamês', 'Siames', 'Siamese'],
  sphynx: ['Sphynx', 'Esfinge'],
};

export const normalizeBreedText = (value?: string | null): string => {
  if (!value) return '';

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const BREED_ALIAS_INDEX = Object.entries(DEFAULT_BREED_ALIAS_GROUPS).reduce<Record<string, string>>(
  (aliases, [canonicalBreed, breedAliases]) => {
    aliases[normalizeBreedText(canonicalBreed)] = canonicalBreed;
    breedAliases.forEach((alias) => {
      aliases[normalizeBreedText(alias)] = canonicalBreed;
    });
    return aliases;
  },
  {},
);

export const getCanonicalBreedKey = (breed?: string | null): string => {
  const normalizedBreed = normalizeBreedText(breed);
  return BREED_ALIAS_INDEX[normalizedBreed] ?? normalizedBreed;
};

export const getBreedComparisonKey = (
  breed?: string | null,
  storedNormalizedBreed?: string | null,
): string => {
  const storedBreedKey = getCanonicalBreedKey(storedNormalizedBreed);
  return storedBreedKey || getCanonicalBreedKey(breed);
};

export const areBreedKeysCompatible = (
  breedKeyA?: string | null,
  breedKeyB?: string | null,
): boolean => Boolean(breedKeyA && breedKeyB && breedKeyA === breedKeyB);

export const areBreedsCompatible = (
  breedA?: string | null,
  breedB?: string | null,
): boolean => areBreedKeysCompatible(getCanonicalBreedKey(breedA), getCanonicalBreedKey(breedB));
