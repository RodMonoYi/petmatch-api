import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity('mensagens')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  conteudo: string;

  @CreateDateColumn()
  enviada_em: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.mensagens)
  @JoinColumn({ name: 'fk_conversa_id' })
  conversa: Conversation;

  @Column({ type: 'text' })
  fk_conversa_id: string;

  @ManyToOne(() => User, (user) => user.mensagens)
  @JoinColumn({ name: 'fk_remetente_id' })
  remetente: User;

  @Column({ type: 'text' })
  fk_remetente_id: string;
}

