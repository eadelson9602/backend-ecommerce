import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

/** Clase para uso en decoradores (emitDecoratorMetadata); el store sigue usando objetos planos. */
export class Usuario {
  id!: number;
  nombre!: string;
  email!: string;
  passwordHash!: string;
  rol!: 'usuario' | 'admin';
}

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  talla: string;
  color: string;
  marca: string;
  stock: number;
}

export interface Carrito {
  id: number;
  usuarioId: number;
}

export interface CarritoItem {
  productoId: number;
  cantidad: number;
}

export interface Pedido {
  id: number;
  usuarioId: number;
  total: number;
  estado: string;
  items: { productoId: number; cantidad: number; precio: number }[];
}

export interface Pago {
  id: number;
  pedidoId: number;
  metodo: string;
  estado: string;
}

export interface Inventario {
  productoId: number;
  cantidad: number;
}

@Injectable()
export class StoreService {
  private idSeq: Record<string, number> = {
    usuario: 1,
    producto: 1,
    carrito: 1,
    pedido: 1,
    pago: 1,
  };
  readonly usuarios = new Map<string, Usuario>();
  readonly productos = new Map<string, Producto>();
  readonly carritos = new Map<string, Carrito>();
  readonly carritoItems = new Map<string, CarritoItem[]>();
  readonly pedidos = new Map<string, Pedido>();
  readonly pagos = new Map<string, Pago>();
  readonly inventario = new Map<string, Inventario>();

  nextId(entidad: keyof typeof this.idSeq): string {
    return String(this.idSeq[entidad] ?? 1);
  }

  incId(entidad: keyof typeof this.idSeq): void {
    this.idSeq[entidad] = (this.idSeq[entidad] ?? 1) + 1;
  }

  async seed(): Promise<void> {
    if (this.usuarios.size > 0) return;

    // --- Usuarios: admin y clientes de ejemplo ---
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);

    this.usuarios.set('1', {
      id: 1,
      nombre: 'Administrador',
      email: 'admin@tienda.com',
      passwordHash: adminHash,
      rol: 'admin',
    });
    this.usuarios.set('2', {
      id: 2,
      nombre: 'María García',
      email: 'maria@example.com',
      passwordHash: userHash,
      rol: 'usuario',
    });
    this.usuarios.set('3', {
      id: 3,
      nombre: 'Carlos López',
      email: 'carlos@example.com',
      passwordHash: userHash,
      rol: 'usuario',
    });
    this.idSeq.usuario = 4;

    // --- Productos de ejemplo (tienda de zapatos, precios en COP) ---
    const productosIniciales: Omit<Producto, 'id'>[] = [
      { nombre: 'Zapatilla Running Pro', precio: 405000, talla: '40', color: 'Negro', marca: 'SportMax', stock: 45 },
      { nombre: 'Zapatilla Running Pro', precio: 405000, talla: '42', color: 'Negro', marca: 'SportMax', stock: 38 },
      { nombre: 'Zapatilla Running Pro', precio: 405000, talla: '44', color: 'Blanco', marca: 'SportMax', stock: 25 },
      { nombre: 'Bota Casual Cuero', precio: 585000, talla: '39', color: 'Marrón', marca: 'UrbanStep', stock: 20 },
      { nombre: 'Bota Casual Cuero', precio: 585000, talla: '41', color: 'Negro', marca: 'UrbanStep', stock: 30 },
      { nombre: 'Sandalia Playa', precio: 157500, talla: '38', color: 'Azul', marca: 'BeachWear', stock: 60 },
      { nombre: 'Sandalia Playa', precio: 157500, talla: '40', color: 'Blanco', marca: 'BeachWear', stock: 55 },
      { nombre: 'Mocasín Clásico', precio: 360000, talla: '40', color: 'Negro', marca: 'ClassicFoot', stock: 22 },
      { nombre: 'Mocasín Clásico', precio: 360000, talla: '42', color: 'Granate', marca: 'ClassicFoot', stock: 18 },
      { nombre: 'Zapato Formal Oxford', precio: 720000, talla: '41', color: 'Negro', marca: 'Elegance', stock: 15 },
      { nombre: 'Zapato Formal Oxford', precio: 720000, talla: '43', color: 'Negro', marca: 'Elegance', stock: 12 },
      { nombre: 'Deportiva Urbana', precio: 297000, talla: '39', color: 'Gris', marca: 'StreetStyle', stock: 40 },
      { nombre: 'Deportiva Urbana', precio: 297000, talla: '42', color: 'Blanco', marca: 'StreetStyle', stock: 35 },
      { nombre: 'Chancla Unisex', precio: 90000, talla: '40', color: 'Negro', marca: 'Basic', stock: 100 },
      { nombre: 'Chancla Unisex', precio: 90000, talla: '42', color: 'Azul', marca: 'Basic', stock: 80 },
    ];

    productosIniciales.forEach((p, i) => {
      const id = i + 1;
      this.productos.set(String(id), { id, ...p });
      this.inventario.set(String(id), { productoId: id, cantidad: p.stock });
    });
    this.idSeq.producto = productosIniciales.length + 1;
  }
}
