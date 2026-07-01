import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export type NotificationType = 'like' | 'match' | 'message';

@Entity('notificacoes')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30 })
  tipo: NotificationType;

  @Column({ length: 120 })
  titulo: string;

  @Column({ type: 'text' })
  mensagem: string;

  @Column({ default: false })
  lida: boolean;

  @Column({ type: 'text', nullable: true })
  dados: string | null;

  @CreateDateColumn()
  criado_em: Date;

  @Column({ type: 'datetime', nullable: true })
  lida_em: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fk_usuario_id' })
  usuario: User;

  @Column({ type: 'text' })
  fk_usuario_id: string;
}
