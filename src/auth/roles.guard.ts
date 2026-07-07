import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from './auth-user.interface';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class RolesGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Autenticação obrigatória');
    }

    if (!requiredRoles.includes(user.role)) {
      if (requiredRoles.length === 1 && requiredRoles[0] === 'admin') {
        throw new ForbiddenException('Acesso restrito a administradores');
      }

      throw new ForbiddenException('Usuário sem permissão para este recurso');
    }

    return true;
  }
}
