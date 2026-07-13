import { User } from '../../entities/user.entity';

type SerializeUserOptions = {
  includePhone?: boolean;
};

export const serializeUserForResponse = (
  user?: User | null,
  options: SerializeUserOptions = {},
) => {
  if (!user) {
    return user ?? null;
  }

  const response: Record<string, unknown> = {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    foto_perfil_url: user.foto_perfil_url,
    localizacao_geo: user.localizacao_geo,
    raio_maximo: user.raio_maximo,
    criado_em: user.criado_em,
    atualizado_em: user.atualizado_em,
  };

  if (options.includePhone) {
    response.telefone = user.telefone;
  }

  return response;
};
