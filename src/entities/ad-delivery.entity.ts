import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ad } from './ad.entity';

@Entity('anuncio_entregas')
@Index('IDX_anuncio_entregas_anuncio', ['adId'])
export class AdDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ad_id', type: 'uuid' })
  adId: string;

  @ManyToOne(() => Ad, (ad) => ad.deliveries, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ad_id' })
  ad: Ad;

  @Column({ name: 'placement', type: 'varchar', length: 120 })
  placement: string;

  @Column({ name: 'impression_tracked_at', type: 'timestamptz', nullable: true })
  impressionTrackedAt: Date | null;

  @Column({ name: 'click_tracked_at', type: 'timestamptz', nullable: true })
  clickTrackedAt: Date | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;
}
