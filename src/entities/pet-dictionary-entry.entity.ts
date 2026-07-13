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
@Index('UQ_pet_dictionary_category_key', ['category', 'canonicalKey'], {
  unique: true,
})
export class PetDictionaryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_pet_dictionary_category')
  @Column({ name: 'category', type: 'varchar', length: 20 })
  category: PetDictionaryCategory;

  @Column({ name: 'canonical_key', type: 'varchar', length: 120 })
  canonicalKey: string;

  @Column({ name: 'label', type: 'varchar', length: 120 })
  label: string;

  @Column({ name: 'aliases', type: 'jsonb', default: () => "'[]'::jsonb" })
  aliases: string[];

  @Index('IDX_pet_dictionary_active')
  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
