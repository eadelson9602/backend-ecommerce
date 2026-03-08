import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PagoService } from '../pago/pago.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { ProductosService } from '../productos/productos.service';
import type { Usuario, Pedido } from '../store/store.service';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagoService: PagoService,
    private readonly mercadopagoService: MercadoPagoService,
    private readonly productosService: ProductosService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get db(): any {
    return this.prisma.prisma;
  }

  private async getCarritoConItems(usuarioId: number) {
    const carrito = await this.db.carrito.findUnique({
      where: { usuarioId },
      include: { items: true },
    });
    return carrito;
  }

  /**
   * Checkout Pro: crea pedido pendiente y preferencia MP; devuelve init_point para redirigir al usuario.
   */
  async createPreferenceForCheckout(user: Usuario): Promise<{
    pedidoId: number;
    initPoint: string;
  }> {
    const carrito = await this.getCarritoConItems(user.id);
    if (!carrito || carrito.items.length === 0)
      throw new BadRequestException('Carrito vacío.');

    let total = 0;
    const lineas: { productoId: number; cantidad: number; precio: number }[] = [];
    const preferenceItems: { id: string; title: string; quantity: number; unit_price: number }[] = [];

    for (const it of carrito.items) {
      const prod = await this.productosService.getById(String(it.productoId));
      if (!prod)
        throw new BadRequestException(`Producto ${it.productoId} no encontrado.`);
      const disponible = prod.stock ?? prod.cantidad ?? 0;
      if (disponible < it.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para ${prod.nombre}.`,
        );
      }
      const precio = Number(prod.precio);
      total += precio * it.cantidad;
      lineas.push({ productoId: it.productoId, cantidad: it.cantidad, precio });
      preferenceItems.push({
        id: String(it.productoId),
        title: prod.nombre,
        quantity: it.cantidad,
        unit_price: precio,
      });
    }
    total = Math.round(total * 100) / 100;

    const pedido = await this.db.pedido.create({
      data: {
        usuarioId: user.id,
        total,
        estado: 'pendiente_pago',
        items: {
          create: lineas.map((l) => ({
            productoId: l.productoId,
            cantidad: l.cantidad,
            precio: l.precio,
          })),
        },
      },
    });

    let baseUrl =
      process.env.MERCADOPAGO_FRONTEND_URL?.trim() || 'http://localhost:5173';
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `http://${baseUrl}`;
    }
    const backUrls = {
      success:
        process.env.MERCADOPAGO_SUCCESS_URL?.trim() ||
        `${baseUrl}/checkout/success`,
      failure:
        process.env.MERCADOPAGO_FAILURE_URL?.trim() ||
        `${baseUrl}/checkout/failure`,
      pending:
        process.env.MERCADOPAGO_PENDING_URL?.trim() ||
        `${baseUrl}/checkout/pending`,
    };
    const notificationUrl = process.env.MERCADOPAGO_NOTIFICATION_URL?.trim() || undefined;

    const { initPoint } = await this.mercadopagoService.createPreference({
      items: preferenceItems,
      external_reference: String(pedido.id),
      back_urls: backUrls,
      notification_url: notificationUrl,
      auto_return: 'approved',
    });

    return { pedidoId: pedido.id, initPoint };
  }

  /**
   * Webhook Checkout Pro: Mercado Pago notifica con topic=payment y id=payment_id. Confirmamos el pedido si está aprobado.
   */
  async handleMercadoPagoWebhook(paymentId: string): Promise<void> {
    const payment = await this.mercadopagoService.getPaymentById(paymentId);
    if (!payment || payment.status !== 'approved') return;
    const ref = payment.external_reference;
    if (!ref) return;
    const pedidoId = Number(ref);
    if (Number.isNaN(pedidoId)) return;
    await this.confirmarPagoMercadoPago(pedidoId);
  }

  /** Confirma un pedido tras pago aprobado por Mercado Pago (llamado desde webhook) */
  async confirmarPagoMercadoPago(pedidoId: number): Promise<boolean> {
    const pedido = await this.db.pedido.findUnique({
      where: { id: pedidoId },
      include: { items: true },
    });
    if (!pedido || pedido.estado !== 'pendiente_pago') return false;

    await this.db.pedido.update({
      where: { id: pedidoId },
      data: { estado: 'confirmado' },
    });

    const carrito = await this.db.carrito.findUnique({ where: { usuarioId: pedido.usuarioId } });
    if (carrito) {
      await this.db.carritoItem.deleteMany({ where: { carritoId: carrito.id } });
    }

    for (const it of pedido.items) {
      try {
        const prod = await this.productosService.getById(String(it.productoId));
        if (prod) {
          const nuevoStock = Math.max(0, (prod.stock ?? 0) - it.cantidad);
          await this.productosService.updateInventario(String(it.productoId), nuevoStock);
        }
      } catch {
        // ignorar error por producto ya eliminado
      }
    }
    return true;
  }

  /** UC6 - Realizar compra (checkout) → incluye UC11 Procesar pago (simulado) */
  async checkout(user: Usuario, metodoPago: string = 'tarjeta') {
    const carrito = await this.getCarritoConItems(user.id);
    if (!carrito || carrito.items.length === 0) throw new BadRequestException('Carrito vacío.');

    let total = 0;
    const lineas: { productoId: number; cantidad: number; precio: number }[] = [];
    for (const it of carrito.items) {
      const prod = await this.productosService.getById(String(it.productoId));
      if (!prod) throw new BadRequestException(`Producto ${it.productoId} no encontrado.`);
      const disponible = prod.stock ?? prod.cantidad ?? 0;
      if (disponible < it.cantidad) {
        throw new BadRequestException(`Stock insuficiente para producto ${it.productoId}.`);
      }
      const precio = Number(prod.precio);
      total += precio * it.cantidad;
      lineas.push({ productoId: it.productoId, cantidad: it.cantidad, precio });
    }
    total = Math.round(total * 100) / 100;

    const resultadoPago = await this.pagoService.procesarPago({
      pedidoId: 0,
      total,
      metodo: metodoPago,
    });

    const pedido = await this.db.pedido.create({
      data: {
        usuarioId: user.id,
        total,
        estado: resultadoPago.aprobado ? 'confirmado' : 'pago_rechazado',
        items: {
          create: lineas.map((l) => ({
            productoId: l.productoId,
            cantidad: l.cantidad,
            precio: l.precio,
          })),
        },
      },
    });

    await this.db.pago.create({
      data: {
        pedidoId: pedido.id,
        metodo: metodoPago,
        estado: resultadoPago.aprobado ? 'aprobado' : 'rechazado',
      },
    });

    if (!resultadoPago.aprobado) {
      throw new BadRequestException({ error: 'Pago rechazado.', pedidoId: pedido.id });
    }

    for (const it of lineas) {
      const prod = await this.productosService.getById(String(it.productoId));
      if (prod) {
        const nuevoStock = Math.max(0, (prod.stock ?? 0) - it.cantidad);
        await this.productosService.updateInventario(String(it.productoId), nuevoStock);
      }
    }
    await this.db.carritoItem.deleteMany({ where: { carritoId: carrito.id } });

    return {
      message: 'Pedido confirmado.',
      pedido: { id: pedido.id, total: Number(pedido.total), estado: pedido.estado },
    };
  }

  /** UC7 - Ver historial de pedidos (usuario) */
  async getMisPedidos(user: Usuario): Promise<Pedido[]> {
    const list = await this.db.pedido.findMany({
      where: { usuarioId: user.id },
      include: { items: true },
      orderBy: { id: 'desc' },
    });
    return list.map(this.toPedidoResponse);
  }

  /** UC10 - Ver pedidos (admin) */
  async getAllPedidos(): Promise<Pedido[]> {
    const list = await this.db.pedido.findMany({
      include: { items: true },
      orderBy: { id: 'desc' },
    });
    return list.map(this.toPedidoResponse);
  }

  async getById(id: string, user: Usuario): Promise<Pedido> {
    const idNum = Number(id);
    if (Number.isNaN(idNum)) throw new NotFoundException('Pedido no encontrado.');
    const pedido = await this.db.pedido.findUnique({
      where: { id: idNum },
      include: { items: true },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado.');
    if (pedido.usuarioId !== user.id && user.rol !== 'admin') {
      throw new ForbiddenException('No autorizado.');
    }
    return this.toPedidoResponse(pedido);
  }

  private toPedidoResponse(
    p: {
      id: number;
      usuarioId: number;
      total: { toNumber?: () => number } | number;
      estado: string;
      createdAt?: Date;
      items: { productoId: number; cantidad: number; precio: { toNumber?: () => number } | number }[];
    },
  ): Pedido {
    return {
      id: p.id,
      usuarioId: p.usuarioId,
      total: typeof p.total === 'object' && typeof p.total.toNumber === 'function' ? p.total.toNumber() : Number(p.total),
      estado: p.estado,
      createdAt: p.createdAt ? p.createdAt.toISOString() : undefined,
      items: p.items.map((it) => ({
        productoId: it.productoId,
        cantidad: it.cantidad,
        precio: typeof it.precio === 'object' && typeof (it.precio as { toNumber?: () => number }).toNumber === 'function'
          ? (it.precio as { toNumber: () => number }).toNumber()
          : Number(it.precio),
      })),
    };
  }
}
