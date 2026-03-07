import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** UC1 - Registrarse */
  @Post('registro')
  async registro(
    @Body('nombre') nombre: string,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    if (!nombre || !email || !password) {
      throw new BadRequestException('Faltan nombre, email o password.');
    }
    const result = await this.authService.registro(nombre, email, password);
    return { message: 'Usuario registrado.', ...result };
  }

  /** UC2 - Iniciar sesión */
  @Post('login')
  async login(@Body('email') email: string, @Body('password') password: string) {
    if (!email || !password) {
      throw new BadRequestException('Email y password requeridos.');
    }
    return this.authService.login(email, password);
  }
}
