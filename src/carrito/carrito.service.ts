import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { StoreService, Carrito, CarritoItem, Usuario } from '../store/store.service';

@Injectable()
export class CarritoService {
  constructor(private readonly store: StoreService) {}

  getOrCreateCarrito(usuarioId: number): Carrito {
    const existente = [...this.store.carritos.values()].find((c) => c.usuarioId === usuarioId);
    if (existente) return existente;
    const id = this.store.nextId('carrito');
    this.store.incId('carrito');
    const carrito: Carrito = { id: Number(id), usuarioId };
    this.store.carritos.set(id, carrito);
    this.store.carritoItems.set(id, []);
    return carrito;
  }

  /** UC5 - Agregar al carrito */
  agregar(user: Usuario, productoId: number, cantidad: number) {
    const prod = this.store.productos.get(String(productoId));
    if (!prod) throw new NotFoundException('Producto no encontrado.');
    const inv = this.store.inventario.get(String(productoId));
    const disponible = inv?.cantidad ?? 0;
    if (disponible < cantidad) {
      throw new BadRequestException({ error: 'Stock insuficiente.', disponible });
    }
    const carrito = this.getOrCreateCarrito(user.id);
    const items = this.store.carritoItems.get(String(carrito.id)) ?? [];
    const idx = items.findIndex((i) => i.productoId === productoId);
    const qty = Number(cantidad);
    if (idx >= 0) {
      if (items[idx].cantidad + qty > disponible) {
        throw new BadRequestException({ error: 'Stock insuficiente.', disponible });
      }
      items[idx].cantidad += qty;
    } else {
      items.push({ productoId, cantidad: qty });
    }
    this.store.carritoItems.set(String(carrito.id), items);
    return {
      carritoId: carrito.id,
      items: items.map((i) => ({
        ...i,
        producto: this.store.productos.get(String(i.productoId)),
      })),
    };
  }

  getCarrito(user: Usuario) {
    const carrito = this.getOrCreateCarrito(user.id);
    const items = this.store.carritoItems.get(String(carrito.id)) ?? [];
    return {
      carrito,
      items: items.map((i) => ({
        ...i,
        producto: this.store.productos.get(String(i.productoId)),
      })),
    };
  }

  actualizarItem(user: Usuario, productoId: number, cantidad: number) {
    const carrito = this.getOrCreateCarrito(user.id);
    const items = this.store.carritoItems.get(String(carrito.id)) ?? [];
    const idx = items.findIndex((i) => i.productoId === productoId);
    if (idx < 0) throw new NotFoundException('Producto no está en el carrito.');
    if (cantidad === 0) {
      items.splice(idx, 1);
    } else {
      items[idx].cantidad = cantidad;
    }
    this.store.carritoItems.set(String(carrito.id), items);
    return { items };
  }
}
