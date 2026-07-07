import { User } from '../../entities/user.entity';

export const serializeUserForResponse = (user?: User | null) => {
  if (!user) {
    return user ?? null;
  }

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    telefone: user.telefone,
    foto_perfil_url: user.foto_perfil_url,
    localizacao_geo: user.localizacao_geo,
    raio_maximo: user.raio_maximo,
    criado_em: user.criado_em,
    atualizado_em: user.atualizado_em,
  };
};
