import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProductoResponse {
  id: number;
  nombre: string;
  precio: number;
  talla: string;
  color: string;
  marca: string;
  stock: number;
  cantidad: number;
  imagenUrl?: string | null;
}

function toResponse(
  p: { id: number; nombre: string; precio: unknown; talla: string; color: string; marca: string; stock: number; imagenUrl?: string | null },
  cantidad?: number,
): ProductoResponse {
  return {
    id: p.id,
    nombre: p.nombre,
    precio: Number(p.precio),
    talla: p.talla,
    color: p.color,
    marca: p.marca,
    stock: p.stock,
    cantidad: cantidad ?? p.stock,
    imagenUrl: p.imagenUrl ?? undefined,
  };
}

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): any {
    return this.prisma.prisma;
  }

  /** UC3 - Ver catálogo desde base de datos */
  async getCatalogo(): Promise<ProductoResponse[]> {
    const list = await this.db.producto.findMany({
      include: { inventario: true },
    });
    return list.map((p) => toResponse(p, p.inventario?.cantidad ?? p.stock));
  }

  /** UC4 - Filtrar productos desde base de datos */
  async filtrar(filtros: {
    nombre?: string;
    talla?: string;
    color?: string;
    marca?: string;
    minPrecio?: number;
    maxPrecio?: number;
  }): Promise<ProductoResponse[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (filtros.nombre) {
      where.nombre = { contains: filtros.nombre, mode: 'insensitive' };
    }
    if (filtros.talla) where.talla = filtros.talla;
    if (filtros.color) where.color = { equals: filtros.color, mode: 'insensitive' };
    if (filtros.marca) {
      where.marca = { contains: filtros.marca, mode: 'insensitive' };
    }
    if (filtros.minPrecio != null || filtros.maxPrecio != null) {
      where.precio = {};
      if (filtros.minPrecio != null) (where.precio as { gte?: number }).gte = filtros.minPrecio;
      if (filtros.maxPrecio != null) (where.precio as { lte?: number }).lte = filtros.maxPrecio;
    }

    const list = await this.db.producto.findMany({
      where,
      include: { inventario: true },
    });
    return list.map((p) => toResponse(p, p.inventario?.cantidad ?? p.stock));
  }

  async getById(id: string): Promise<ProductoResponse | null> {
    const idNum = Number(id);
    if (Number.isNaN(idNum)) return null;
    const p = await this.db.producto.findUnique({
      where: { id: idNum },
      include: { inventario: true },
    });
    if (!p) return null;
    return toResponse(p, p.inventario?.cantidad ?? p.stock);
  }

  /** UC8 - Admin: crear producto en base de datos */
  async create(dto: { nombre: string; precio: number; talla?: string; color?: string; marca?: string; stock?: number; imagenUrl?: string | null }): Promise<ProductoResponse> {
    const stock = Number(dto.stock) ?? 0;
    const producto = await this.db.producto.create({
      data: {
        nombre: dto.nombre,
        precio: dto.precio,
        talla: dto.talla ?? '',
        color: dto.color ?? '',
        marca: dto.marca ?? '',
        stock,
        imagenUrl: dto.imagenUrl ?? null,
      },
    });
    await this.db.inventario.create({
      data: { productoId: producto.id, cantidad: stock },
    });
    return toResponse(producto);
  }

  /** UC8 - Admin: actualizar producto */
  async update(id: string, dto: Partial<{ nombre: string; precio: number; talla: string; color: string; marca: string; stock: number; imagenUrl?: string | null }>): Promise<ProductoResponse> {
    const idNum = Number(id);
    if (Number.isNaN(idNum)) throw new NotFoundException('Producto no encontrado.');
    const existing = await this.db.producto.findUnique({ where: { id: idNum } });
    if (!existing) throw new NotFoundException('Producto no encontrado.');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (dto.nombre != null) data.nombre = dto.nombre;
    if (dto.precio != null) data.precio = dto.precio;
    if (dto.talla != null) data.talla = dto.talla;
    if (dto.color != null) data.color = dto.color;
    if (dto.marca != null) data.marca = dto.marca;
    if (dto.imagenUrl !== undefined) data.imagenUrl = dto.imagenUrl || null;
    if (dto.stock != null) {
      data.stock = dto.stock;
      await this.db.inventario.upsert({
        where: { productoId: idNum },
        update: { cantidad: dto.stock },
        create: { productoId: idNum, cantidad: dto.stock },
      });
    }

    const producto = await this.db.producto.update({
      where: { id: idNum },
      data,
    });
    return toResponse(producto);
  }

  /** UC8 - Admin: eliminar producto */
  async delete(id: string): Promise<void> {
    const idNum = Number(id);
    if (Number.isNaN(idNum)) throw new NotFoundException('Producto no encontrado.');
    const existing = await this.db.producto.findUnique({ where: { id: idNum } });
    if (!existing) throw new NotFoundException('Producto no encontrado.');
    await this.db.producto.delete({ where: { id: idNum } });
  }

  /** UC9 - Admin: actualizar inventario */
  async updateInventario(id: string, cantidad: number): Promise<{ productoId: number; cantidad: number }> {
    const idNum = Number(id);
    if (Number.isNaN(idNum)) throw new NotFoundException('Producto no encontrado.');
    const existing = await this.db.producto.findUnique({ where: { id: idNum } });
    if (!existing) throw new NotFoundException('Producto no encontrado.');

    await this.db.producto.update({
      where: { id: idNum },
      data: { stock: cantidad },
    });
    const inv = await this.db.inventario.upsert({
      where: { productoId: idNum },
      update: { cantidad },
      create: { productoId: idNum, cantidad },
    });
    return { productoId: inv.productoId, cantidad: inv.cantidad };
  }
}
