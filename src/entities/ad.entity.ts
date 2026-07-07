import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { AdDelivery } from './ad-delivery.entity';
import { AdCompetitionGroup } from './ad-competition-group.entity';
import { AdPlacement } from './ad-placement.entity';

export type AdType = 'image' | 'text';
export type AdStatus = 'active' | 'inactive';
export type AdDisplayMode = 'native' | 'image_only';
export type AdCreativeSize =
  | 'auto'
  | 'banner_468x60'
  | 'leaderboard_728x90'
  | 'mobile_leaderboard_320x50'
  | 'square_250x250'
  | 'small_rectangle_200x200'
  | 'medium_rectangle_300x250'
  | 'large_rectangle_336x280'
  | 'half_page_300x600'
  | 'wide_skyscraper_160x600'
  | 'skyscraper_120x600';

@Entity('anuncios')
@Index('IDX_anuncios_status', ['status'])
@Index('IDX_anuncios_periodo', ['startsAt', 'endsAt'])
export class Ad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'type', type: 'varchar', length: 20 })
  type: AdType;

  @Column({ name: 'title', type: 'varchar', length: 160 })
  title: string;

  @Column({ name: 'content', type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'image_mobile_url', type: 'text', nullable: true })
  imageMobileUrl: string | null;

  @Column({ name: 'image_alt_text', type: 'varchar', length: 160, nullable: true })
  imageAltText: string | null;

  @Column({ name: 'display_mode', type: 'varchar', length: 30, default: 'native' })
  displayMode: AdDisplayMode;

  @Column({ name: 'creative_size', type: 'varchar', length: 40, default: 'auto' })
  creativeSize: AdCreativeSize;

  @Column({ name: 'target_url', type: 'text', nullable: true })
  targetUrl: string | null;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ name: 'priority', type: 'integer', default: 1 })
  priority: number;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'inactive' })
  status: AdStatus;

  @Column({ name: 'impressions_limit', type: 'integer', nullable: true })
  impressionsLimit: number | null;

  @Column({ name: 'clicks_limit', type: 'integer', nullable: true })
  clicksLimit: number | null;

  @Column({ name: 'impressions_count', type: 'integer', default: 0 })
  impressionsCount: number;

  @Column({ name: 'clicks_count', type: 'integer', default: 0 })
  clicksCount: number;

  @Column({ name: 'competition_group_id', type: 'uuid', nullable: true })
  competitionGroupId: string | null;

  @ManyToOne(() => AdCompetitionGroup, (group) => group.ads, {
    nullable: true,
  })
  @JoinColumn({ name: 'competition_group_id' })
  competitionGroup: AdCompetitionGroup | null;

  @ManyToMany(() => AdPlacement, (placement) => placement.ads)
  @JoinTable({
    name: 'anuncios_placements',
    joinColumn: {
      name: 'ad_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'placement_id',
      referencedColumnName: 'id',
    },
  })
  placements: AdPlacement[];

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User, (user) => user.anuncios_criados, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => AdDelivery, (delivery) => delivery.ad)
  deliveries: AdDelivery[];

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
