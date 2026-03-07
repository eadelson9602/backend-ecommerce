import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { StoreService, Carrito, CarritoItem, Usuario } from '../store/store.service';
import { ProductosService } from '../productos/productos.service';

@Injectable()
export class CarritoService {
  constructor(
    private readonly store: StoreService,
    private readonly productosService: ProductosService,
  ) {}

  /** Enriquecer items con producto desde base de datos (precio actual en COP) */
  private async itemsConProductos(items: CarritoItem[]) {
    return Promise.all(
      items.map(async (i) => {
        const producto = await this.productosService.getById(String(i.productoId));
        return { ...i, producto: producto ?? undefined };
      }),
    );
  }

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

  /** UC5 - Agregar al carrito (valida producto y stock desde BD, precios en COP) */
  async agregar(user: Usuario, productoId: number, cantidad: number) {
    const prod = await this.productosService.getById(String(productoId));
    if (!prod) throw new NotFoundException('Producto no encontrado.');
    const disponible = prod.stock ?? prod.cantidad ?? 0;
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
    const itemsConProducto = await this.itemsConProductos(items);
    return { carritoId: carrito.id, items: itemsConProducto };
  }

  async getCarrito(user: Usuario) {
    const carrito = this.getOrCreateCarrito(user.id);
    const items = this.store.carritoItems.get(String(carrito.id)) ?? [];
    const itemsConProducto = await this.itemsConProductos(items);
    return { carrito, items: itemsConProducto };
  }

  async actualizarItem(user: Usuario, productoId: number, cantidad: number) {
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
    const itemsConProducto = await this.itemsConProductos(items);
    return { items: itemsConProducto };
  }
}
