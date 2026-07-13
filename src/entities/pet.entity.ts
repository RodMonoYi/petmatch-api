import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Match } from './match.entity';

@Entity('pets')
export class Pet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nome: string;

  @Column({ length: 50 })
  especie: string;

  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  especie_normalizada?: string | null;

  @Column({ length: 100 })
  raca: string;

  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  raca_normalizada?: string | null;

  @Column({ type: 'date' })
  data_nascimento: Date;

  @Column({ length: 10 })
  genero: string;

  @Column({ length: 20 })
  porte: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'text', nullable: true })
  fotos: string;

  @Column({ default: false })
  pedigree: boolean;

  @Column({ type: 'text', nullable: true })
  dados_saude: string;

  @Column({ default: false })
  verificado_clinica: boolean;

  @Column({ default: true })
  disponivel_reproducao: boolean;

  @Column({ default: false })
  aceita_viagem: boolean;

  @Index()
  @Column({ default: true })
  ativo: boolean;

  @Column({ type: 'text', nullable: true })
  fk_clinica_verificadora_id: string;

  @CreateDateColumn()
  criado_em: Date;

  @UpdateDateColumn()
  atualizado_em: Date;

  @ManyToOne(() => User, (user) => user.pets)
  @JoinColumn({ name: 'fk_usuario_id' })
  usuario: User;

  @Column({ type: 'uuid' })
  fk_usuario_id: string;

  @OneToMany(() => Match, (match) => match.pet1)
  matches_como_pet1: Match[];

  @OneToMany(() => Match, (match) => match.pet2)
  matches_como_pet2: Match[];
}
