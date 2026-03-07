import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { StoreService, Usuario } from '../store/store.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly store: StoreService,
    private readonly jwtService: JwtService,
  ) {}

  async registro(nombre: string, email: string, password: string) {
    const existente = [...this.store.usuarios.values()].find((u) => u.email === email);
    if (existente) throw new ConflictException('Ya existe un usuario con ese email.');
    const id = this.store.nextId('usuario');
    this.store.incId('usuario');
    const passwordHash = await bcrypt.hash(password, 10);
    const usuario: Usuario = {
      id: Number(id),
      nombre,
      email,
      passwordHash,
      rol: 'usuario',
    };
    this.store.usuarios.set(id, usuario);
    const token = this.jwtService.sign({ sub: id, email: usuario.email });
    return { token, usuario: this.sanitize(usuario) };
  }

  async login(email: string, password: string) {
    const usuario = [...this.store.usuarios.values()].find((u) => u.email === email);
    if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }
    const token = this.jwtService.sign({ sub: String(usuario.id), email: usuario.email });
    return { token, usuario: this.sanitize(usuario) };
  }

  findById(id: string): Usuario | undefined {
    return this.store.usuarios.get(id);
  }

  private sanitize(u: Usuario) {
    return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
  }
}
