import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Usuario } from '../../store/store.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Usuario => {
    return ctx.switchToHttp().getRequest().user;
  },
);
