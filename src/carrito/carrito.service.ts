import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductosService } from '../productos/productos.service';
import type { Usuario } from '../store/store.service';

@Injectable()
export class CarritoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productosService: ProductosService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): any {
    return this.prisma.prisma;
  }

  /** Enriquecer items con producto desde base de datos (precio actual en COP) */
  private async itemsConProductos(
    items: { productoId: number; cantidad: number }[],
  ): Promise<{ productoId: number; cantidad: number; producto?: Awaited<ReturnType<ProductosService['getById']>> }[]> {
    return Promise.all(
      items.map(async (i) => {
        const producto = await this.productosService.getById(String(i.productoId));
        return { ...i, producto: producto ?? undefined };
      }),
    );
  }

  async getOrCreateCarrito(usuarioId: number): Promise<{ id: number; usuarioId: number }> {
    let carrito = await this.db.carrito.findUnique({ where: { usuarioId } });
    if (!carrito) {
      carrito = await this.db.carrito.create({
        data: { usuarioId },
      });
    }
    return { id: carrito.id, usuarioId: carrito.usuarioId };
  }

  /** UC5 - Agregar al carrito (valida producto y stock desde BD, precios en COP) */
  async agregar(user: Usuario, productoId: number, cantidad: number) {
    const prod = await this.productosService.getById(String(productoId));
    if (!prod) throw new NotFoundException('Producto no encontrado.');
    const disponible = prod.stock ?? prod.cantidad ?? 0;
    if (disponible < cantidad) {
      throw new BadRequestException({ error: 'Stock insuficiente.', disponible });
    }
    const carrito = await this.getOrCreateCarrito(user.id);
    const qty = Number(cantidad);
    const existing = await this.db.carritoItem.findUnique({
      where: { carritoId_productoId: { carritoId: carrito.id, productoId } },
    });
    if (existing) {
      const newCantidad = existing.cantidad + qty;
      if (newCantidad > disponible) {
        throw new BadRequestException({ error: 'Stock insuficiente.', disponible });
      }
      await this.db.carritoItem.update({
        where: { carritoId_productoId: { carritoId: carrito.id, productoId } },
        data: { cantidad: newCantidad },
      });
    } else {
      await this.db.carritoItem.create({
        data: { carritoId: carrito.id, productoId, cantidad: qty },
      });
    }
    const items = await this.db.carritoItem.findMany({
      where: { carritoId: carrito.id },
      select: { productoId: true, cantidad: true },
    });
    const itemsConProducto = await this.itemsConProductos(items);
    return { carritoId: carrito.id, items: itemsConProducto };
  }

  async getCarrito(user: Usuario) {
    const carrito = await this.getOrCreateCarrito(user.id);
    const items = await this.db.carritoItem.findMany({
      where: { carritoId: carrito.id },
      select: { productoId: true, cantidad: true },
    });
    const itemsConProducto = await this.itemsConProductos(items);
    return { carrito, items: itemsConProducto };
  }

  async actualizarItem(user: Usuario, productoId: number, cantidad: number) {
    const carrito = await this.getOrCreateCarrito(user.id);
    const existing = await this.db.carritoItem.findUnique({
      where: { carritoId_productoId: { carritoId: carrito.id, productoId } },
    });
    if (!existing) throw new NotFoundException('Producto no está en el carrito.');
    if (cantidad === 0) {
      await this.db.carritoItem.delete({
        where: { carritoId_productoId: { carritoId: carrito.id, productoId } },
      });
    } else {
      await this.db.carritoItem.update({
        where: { carritoId_productoId: { carritoId: carrito.id, productoId } },
        data: { cantidad },
      });
    }
    const items = await this.db.carritoItem.findMany({
      where: { carritoId: carrito.id },
      select: { productoId: true, cantidad: true },
    });
    const itemsConProducto = await this.itemsConProductos(items);
    return { items: itemsConProducto };
  }
}
