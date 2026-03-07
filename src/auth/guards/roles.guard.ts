import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Usuario } from '../../store/store.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles?.length) return true;
    const { user } = context.switchToHttp().getRequest<{ user: Usuario }>();
    return user && roles.includes(user.rol);
  }
}
