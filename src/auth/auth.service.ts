import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { Usuario } from '../store/store.service';

type UsuarioRow = {
  id: number;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: string;
};

type UsuarioDelegate = {
  findUnique: (args: {
    where: { email?: string; id?: number };
  }) => Promise<UsuarioRow | null>;
  create: (args: {
    data: {
      nombre: string;
      email: string;
      passwordHash: string;
      rol: string;
    };
  }) => Promise<UsuarioRow>;
  findMany: (args: {
    select: { id: boolean; nombre: boolean; email: boolean; rol: boolean };
  }) => Promise<{ id: number; nombre: string; email: string; rol: string }[]>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private get db(): { usuario: UsuarioDelegate } {
    return this.prisma.prisma as { usuario: UsuarioDelegate };
  }

  async registro(nombre: string, email: string, password: string) {
    const existente = await this.db.usuario.findUnique({ where: { email } });
    if (existente)
      throw new ConflictException('Ya existe un usuario con ese email.');
    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await this.db.usuario.create({
      data: { nombre, email, passwordHash, rol: 'usuario' },
    });
    const token = this.jwtService.sign({
      sub: String(usuario.id),
      email: usuario.email,
    });
    return { token, usuario: this.sanitize(usuario) };
  }

  async login(email: string, password: string) {
    const usuario = await this.db.usuario.findUnique({ where: { email } });
    if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }
    const token = this.jwtService.sign({
      sub: String(usuario.id),
      email: usuario.email,
    });
    return { token, usuario: this.sanitize(usuario) };
  }

  async findById(id: string): Promise<Usuario | null> {
    const idNum = Number(id);
    if (Number.isNaN(idNum)) return null;
    const usuario = await this.db.usuario.findUnique({
      where: { id: idNum },
    });
    return usuario ? this.sanitize(usuario) : null;
  }

  /** Listar todos los usuarios (solo admin; sin password) */
  async getAllUsuarios(): Promise<
    { id: number; nombre: string; email: string; rol: string }[]
  > {
    const list = await this.db.usuario.findMany({
      select: { id: true, nombre: true, email: true, rol: true },
    });
    return list.map(
      (u: { id: number; nombre: string; email: string; rol: string }) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
      }),
    );
  }

  private sanitize(u: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
  }): Usuario {
    return {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol as 'usuario' | 'admin',
    };
  }
}
