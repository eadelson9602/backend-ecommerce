import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Listar usuarios (solo admin) */
  @Get('usuarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getUsuarios() {
    return this.authService.getAllUsuarios();
  }

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
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    if (!email || !password) {
      throw new BadRequestException('Email y password requeridos.');
    }
    return this.authService.login(email, password);
  }
}
