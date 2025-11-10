import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Pet } from './pet.entity';

@Entity('swipes')
@Unique(['fk_pet_id_1', 'fk_pet_id_2'])
export class Swipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10 })
  action: string; // 'like' ou 'dislike'

  @CreateDateColumn()
  criado_em: Date;

  @ManyToOne(() => Pet)
  @JoinColumn({ name: 'fk_pet_id_1' })
  pet1: Pet;

  @Column({ type: 'text' })
  fk_pet_id_1: string; // Pet que fez o swipe

  @ManyToOne(() => Pet)
  @JoinColumn({ name: 'fk_pet_id_2' })
  pet2: Pet;

  @Column({ type: 'text' })
  fk_pet_id_2: string; // Pet que recebeu o swipe
}

