import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Pet } from './pet.entity';

@Entity('pets_salvos')
@Unique(['fk_usuario_id', 'fk_pet_id'])
export class SavedPet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  criado_em: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fk_usuario_id' })
  usuario: User;

  @Column({ type: 'text' })
  fk_usuario_id: string;

  @ManyToOne(() => Pet)
  @JoinColumn({ name: 'fk_pet_id' })
  pet: Pet;

  @Column({ type: 'text' })
  fk_pet_id: string;
}
