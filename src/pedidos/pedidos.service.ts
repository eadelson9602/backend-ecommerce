import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { StoreService, Usuario, Pedido } from '../store/store.service';
import { PagoService } from '../pago/pago.service';

@Injectable()
export class PedidosService {
  constructor(
    private readonly store: StoreService,
    private readonly pagoService: PagoService,
  ) {}

  private getCarrito(usuarioId: number) {
    return [...this.store.carritos.values()].find((c) => c.usuarioId === usuarioId);
  }

  /** UC6 - Realizar compra (checkout) → incluye UC11 Procesar pago */
  async checkout(user: Usuario, metodoPago: string = 'tarjeta') {
    const carrito = this.getCarrito(user.id);
    if (!carrito) throw new BadRequestException('Carrito vacío.');
    const items = this.store.carritoItems.get(String(carrito.id)) ?? [];
    if (items.length === 0) throw new BadRequestException('Carrito vacío.');

    let total = 0;
    const lineas: { productoId: number; cantidad: number; precio: number }[] = [];
    for (const it of items) {
      const prod = this.store.productos.get(String(it.productoId));
      const inv = this.store.inventario.get(String(it.productoId));
      if (!prod || !inv || inv.cantidad < it.cantidad) {
        throw new BadRequestException(`Stock insuficiente para producto ${it.productoId}.`);
      }
      total += prod.precio * it.cantidad;
      lineas.push({ productoId: it.productoId, cantidad: it.cantidad, precio: prod.precio });
    }
    total = Math.round(total * 100) / 100;

    const pedidoId = this.store.nextId('pedido');
    this.store.incId('pedido');
    const pedido: Pedido = {
      id: Number(pedidoId),
      usuarioId: user.id,
      total,
      estado: 'pendiente_pago',
      items: lineas,
    };
    this.store.pedidos.set(pedidoId, pedido);

    const resultadoPago = await this.pagoService.procesarPago({
      pedidoId: pedido.id,
      total: pedido.total,
      metodo: metodoPago,
    });

    const pagoId = this.store.nextId('pago');
    this.store.incId('pago');
    this.store.pagos.set(pagoId, {
      id: Number(pagoId),
      pedidoId: pedido.id,
      metodo: metodoPago,
      estado: resultadoPago.aprobado ? 'aprobado' : 'rechazado',
    });

    if (!resultadoPago.aprobado) {
      pedido.estado = 'pago_rechazado';
      throw new BadRequestException({ error: 'Pago rechazado.', pedidoId: pedido.id });
    }

    pedido.estado = 'confirmado';
    for (const it of items) {
      const inv = this.store.inventario.get(String(it.productoId));
      const prod = this.store.productos.get(String(it.productoId));
      if (inv) inv.cantidad -= it.cantidad;
      if (prod) prod.stock = inv?.cantidad ?? 0;
    }
    this.store.carritoItems.set(String(carrito.id), []);

    return { message: 'Pedido confirmado.', pedido: { id: pedido.id, total: pedido.total, estado: pedido.estado } };
  }

  /** UC7 - Ver historial de pedidos (usuario) */
  getMisPedidos(user: Usuario): Pedido[] {
    return [...this.store.pedidos.values()].filter((p) => p.usuarioId === user.id);
  }

  /** UC10 - Ver pedidos (admin) */
  getAllPedidos(): Pedido[] {
    return [...this.store.pedidos.values()];
  }

  getById(id: string, user: Usuario): Pedido {
    const pedido = this.store.pedidos.get(id);
    if (!pedido) throw new NotFoundException('Pedido no encontrado.');
    if (pedido.usuarioId !== user.id && user.rol !== 'admin') {
      throw new ForbiddenException('No autorizado.');
    }
    return pedido;
  }
}
