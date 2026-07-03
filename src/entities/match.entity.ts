import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
} from 'typeorm';
import { Pet } from './pet.entity';
import { Conversation } from './conversation.entity';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, default: 'pendente' })
  status: string;

  @CreateDateColumn()
  criado_em: Date;

  @ManyToOne(() => Pet, (pet) => pet.matches_como_pet1)
  @JoinColumn({ name: 'fk_pet_id_1' })
  pet1: Pet;

  @Column({ type: 'uuid' })
  fk_pet_id_1: string;

  @ManyToOne(() => Pet, (pet) => pet.matches_como_pet2)
  @JoinColumn({ name: 'fk_pet_id_2' })
  pet2: Pet;

  @Column({ type: 'uuid' })
  fk_pet_id_2: string;

  @OneToOne(() => Conversation, (conversation) => conversation.match)
  conversa: Conversation;
}
