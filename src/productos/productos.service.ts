import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { StoreService, Producto } from '../store/store.service';

@Injectable()
export class ProductosService {
  constructor(private readonly store: StoreService) {}

  /** UC3 - Ver catálogo */
  getCatalogo(): (Producto & { cantidad: number })[] {
    return [...this.store.productos.values()].map((p) => ({
      ...p,
      cantidad: this.store.inventario.get(String(p.id))?.cantidad ?? 0,
    }));
  }

  /** UC4 - Filtrar productos */
  filtrar(filtros: {
    nombre?: string;
    talla?: string;
    color?: string;
    marca?: string;
    minPrecio?: number;
    maxPrecio?: number;
  }): (Producto & { cantidad: number })[] {
    let list = [...this.store.productos.values()];
    if (filtros.nombre) {
      list = list.filter((p) =>
        p.nombre.toLowerCase().includes(filtros.nombre!.toLowerCase()),
      );
    }
    if (filtros.talla) list = list.filter((p) => p.talla === filtros.talla);
    if (filtros.color) list = list.filter((p) => p.color.toLowerCase() === filtros.color!.toLowerCase());
    if (filtros.marca) {
      list = list.filter((p) => p.marca.toLowerCase().includes(filtros.marca!.toLowerCase()));
    }
    if (filtros.minPrecio != null) list = list.filter((p) => p.precio >= filtros.minPrecio!);
    if (filtros.maxPrecio != null) list = list.filter((p) => p.precio <= filtros.maxPrecio!);
    return list.map((p) => ({
      ...p,
      cantidad: this.store.inventario.get(String(p.id))?.cantidad ?? 0,
    }));
  }

  getById(id: string): (Producto & { cantidad: number }) | null {
    const p = this.store.productos.get(id);
    if (!p) return null;
    const cantidad = this.store.inventario.get(id)?.cantidad ?? 0;
    return { ...p, cantidad };
  }

  /** UC8 - Admin: crear producto */
  create(dto: Partial<Producto>): Producto {
    const id = this.store.nextId('producto');
    this.store.incId('producto');
    const producto: Producto = {
      id: Number(id),
      nombre: dto.nombre!,
      precio: Number(dto.precio) ?? 0,
      talla: dto.talla ?? '',
      color: dto.color ?? '',
      marca: dto.marca ?? '',
      stock: Number(dto.stock) ?? 0,
    };
    this.store.productos.set(id, producto);
    this.store.inventario.set(id, { productoId: producto.id, cantidad: producto.stock });
    return producto;
  }

  /** UC8 - Admin: actualizar producto */
  update(id: string, dto: Partial<Producto>): Producto {
    const prod = this.store.productos.get(id);
    if (!prod) throw new NotFoundException('Producto no encontrado.');
    if (dto.nombre != null) prod.nombre = dto.nombre;
    if (dto.precio != null) prod.precio = Number(dto.precio);
    if (dto.talla != null) prod.talla = dto.talla;
    if (dto.color != null) prod.color = dto.color;
    if (dto.marca != null) prod.marca = dto.marca;
    if (dto.stock != null) {
      prod.stock = Number(dto.stock);
      const inv = this.store.inventario.get(id);
      if (inv) inv.cantidad = prod.stock;
    }
    return prod;
  }

  /** UC8 - Admin: eliminar producto */
  delete(id: string): void {
    if (!this.store.productos.has(id)) throw new NotFoundException('Producto no encontrado.');
    this.store.productos.delete(id);
    this.store.inventario.delete(id);
  }

  /** UC9 - Admin: actualizar inventario */
  updateInventario(id: string, cantidad: number) {
    const prod = this.store.productos.get(id);
    if (!prod) throw new NotFoundException('Producto no encontrado.');
    const inv = this.store.inventario.get(id) || { productoId: Number(id), cantidad: 0 };
    inv.cantidad = cantidad;
    this.store.inventario.set(id, inv);
    prod.stock = cantidad;
    return inv;
  }
}
