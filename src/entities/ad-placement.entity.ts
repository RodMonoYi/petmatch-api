import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ad } from './ad.entity';

@Entity('ad_placements')
export class AdPlacement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_ad_placements_code', { unique: true })
  @Column({ name: 'code', type: 'varchar', length: 120, unique: true })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @ManyToMany(() => Ad, (ad) => ad.placements)
  ads: Ad[];

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
