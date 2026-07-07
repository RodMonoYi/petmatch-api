import { UserRole } from '../entities/user.entity';

export interface AuthenticatedUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  telefone?: string | null;
  foto_perfil_url?: string | null;
  localizacao_geo?: string | null;
  raio_maximo?: number | null;
  criado_em: Date;
  atualizado_em: Date;
}
