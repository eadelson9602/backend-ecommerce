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
    const adminHash = await bcrypt.hash('admin123', 10);
    this.usuarios.set('1', {
      id: 1,
      nombre: 'Administrador',
      email: 'admin@tienda.com',
      passwordHash: adminHash,
      rol: 'admin',
    });
    this.idSeq.usuario = 2;
    const productosIniciales: Omit<Producto, 'id'>[] = [
      { nombre: 'Camiseta', precio: 19.99, talla: 'M', color: 'Negro', marca: 'MarcaX', stock: 50 },
      { nombre: 'Pantalón', precio: 39.99, talla: 'L', color: 'Azul', marca: 'MarcaY', stock: 30 },
      { nombre: 'Zapatillas', precio: 59.99, talla: '42', color: 'Blanco', marca: 'MarcaZ', stock: 20 },
    ];
    productosIniciales.forEach((p, i) => {
      const id = i + 1;
      this.productos.set(String(id), { id, ...p });
      this.inventario.set(String(id), { productoId: id, cantidad: p.stock });
    });
    this.idSeq.producto = 4;
  }
}
