import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ad } from './ad.entity';

@Entity('ad_competition_groups')
export class AdCompetitionGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_ad_competition_groups_code', { unique: true })
  @Column({ name: 'code', type: 'varchar', length: 120, unique: true })
  code: string;

  @Index('IDX_ad_competition_groups_name', { unique: true })
  @Column({ name: 'name', type: 'varchar', length: 120, unique: true })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => Ad, (ad) => ad.competitionGroup)
  ads: Ad[];

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
