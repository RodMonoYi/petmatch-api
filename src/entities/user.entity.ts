import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Pet } from './pet.entity';
import { Message } from './message.entity';
import { Ad } from './ad.entity';

export type UserRole = 'admin' | 'user';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  nome: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255, select: false })
  senha_hash: string;

  @Column({ length: 20, default: 'user' })
  role: UserRole;

  @Column({ length: 20, nullable: true })
  telefone: string;

  @Column({ type: 'text', nullable: true })
  foto_perfil_url: string | null;

  @Column({ type: 'text', nullable: true })
  localizacao_geo: string; // JSON: { latitude: number, longitude: number }

  @Column({ type: 'integer', default: 20, nullable: true })
  raio_maximo: number; // Alcance máximo em km (5, 10, 20, 50, 100)

  @CreateDateColumn()
  criado_em: Date;

  @UpdateDateColumn()
  atualizado_em: Date;

  @OneToMany(() => Pet, (pet) => pet.usuario)
  pets: Pet[];

  @OneToMany(() => Message, (message) => message.remetente)
  mensagens: Message[];

  @OneToMany(() => Ad, (ad) => ad.creator)
  anuncios_criados: Ad[];
}
