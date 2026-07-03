import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Match } from './match.entity';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity('conversas')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  criado_em: Date;

  @OneToOne(() => Match, (match) => match.conversa)
  @JoinColumn({ name: 'fk_match_id' })
  match: Match;

  @Column({ type: 'uuid' })
  fk_match_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fk_participante_1_id' })
  participante1: User;

  @Column({ type: 'uuid' })
  fk_participante_1_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fk_participante_2_id' })
  participante2: User;

  @Column({ type: 'uuid' })
  fk_participante_2_id: string;

  @OneToMany(() => Message, (message) => message.conversa)
  mensagens: Message[];
}
