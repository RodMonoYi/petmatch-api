import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PetDictionaryCategory = 'species' | 'breed';

@Entity('pet_dictionary_entries')
@Index('UQ_pet_dictionary_species_key', ['category', 'canonicalKey'], {
  unique: true,
  where: `"category" = 'species'`,
})
@Index(
  'UQ_pet_dictionary_breed_species_key',
  ['category', 'speciesCanonicalKey', 'canonicalKey'],
  {
    unique: true,
    where: `"category" = 'breed'`,
  },
)
@Index('IDX_pet_dictionary_category_species', [
  'category',
  'speciesCanonicalKey',
])
@Index('IDX_pet_dictionary_category', ['category'])
@Index('IDX_pet_dictionary_active', ['active'])
@Index('IDX_pet_dictionary_species_key', ['speciesCanonicalKey'])
export class PetDictionaryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'category', type: 'varchar', length: 20 })
  category: PetDictionaryCategory;

  @Column({
    name: 'species_canonical_key',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  speciesCanonicalKey: string | null;

  @Column({ name: 'canonical_key', type: 'varchar', length: 120 })
  canonicalKey: string;

  @Column({ name: 'label', type: 'varchar', length: 120 })
  label: string;

  @Column({ name: 'aliases', type: 'jsonb', default: () => "'[]'::jsonb" })
  aliases: string[];

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
