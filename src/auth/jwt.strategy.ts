import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret-ecommerce-dev',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = this.authService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Usuario no encontrado.');
    return user;
  }
}
