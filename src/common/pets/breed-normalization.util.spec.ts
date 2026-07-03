import {
  areBreedsCompatible,
  getBreedComparisonKey,
  getCanonicalBreedKey,
  normalizeBreedText,
} from './breed-normalization.util';

describe('breed normalization', () => {
  it('normalizes accents, casing and punctuation', () => {
    expect(normalizeBreedText('  DÁL-MATA!!  ')).toBe('dal mata');
    expect(getCanonicalBreedKey('Dálmata')).toBe('dalmata');
    expect(getCanonicalBreedKey('dalmata')).toBe('dalmata');
  });

  it('maps common aliases to the same canonical key', () => {
    expect(getCanonicalBreedKey('Vira-lata')).toBe('srd');
    expect(getCanonicalBreedKey('Sem raça definida')).toBe('srd');
    expect(getCanonicalBreedKey('Shihtzu')).toBe('shih tzu');
    expect(getCanonicalBreedKey('Shih Tzu')).toBe('shih tzu');
  });

  it('compares canonical breed keys', () => {
    expect(areBreedsCompatible('Dalmata', 'dálmata')).toBe(true);
    expect(areBreedsCompatible('Vira lata', 'SRD')).toBe(true);
    expect(areBreedsCompatible('Dálmata', 'Poodle')).toBe(false);
  });

  it('uses the stored normalized breed when present', () => {
    expect(getBreedComparisonKey('Dálmata', 'dalmata')).toBe('dalmata');
    expect(getBreedComparisonKey('Dálmata', null)).toBe('dalmata');
  });
});
