import { Controller, Get, Query, Logger } from '@nestjs/common';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { PedidosService } from '../pedidos/pedidos.service';

@Controller('api/pagos')
export class PagoController {
  private readonly logger = new Logger(PagoController.name);

  constructor(
    private readonly mercadopagoService: MercadoPagoService,
    private readonly pedidosService: PedidosService,
  ) {}

  /**
   * Detalle de un pago (para mostrar en la página de error/failure).
   * Mercado Pago redirige a tu failure URL con ?payment_id=xxx (a veces payment_status).
   * El frontend puede llamar GET /api/pagos/detalle?payment_id=xxx y mostrar mensaje.
   */
  @Get('detalle')
  async getDetallePago(@Query('payment_id') paymentId: string): Promise<{
    payment_id: string;
    status?: string;
    status_detail?: string;
    message: string;
  }> {
    if (!paymentId?.trim()) {
      return {
        payment_id: paymentId ?? '',
        message: 'No se recibió ID de pago.',
      };
    }
    const detail = await this.mercadopagoService.getPaymentById(
      paymentId.trim(),
    );
    if (!detail) {
      return {
        payment_id: paymentId,
        message: 'No se pudo obtener el detalle del pago.',
      };
    }
    const message =
      detail.status === 'rejected' || detail.status === 'cancelled'
        ? MercadoPagoService.statusDetailMessage(detail.status_detail)
        : detail.status === 'pending'
          ? 'El pago está pendiente.'
          : 'Pago procesado.';
    return {
      payment_id: paymentId,
      status: detail.status,
      status_detail: detail.status_detail,
      message,
    };
  }

  /** Webhook de Mercado Pago: notificación de pago (topic=payment, id=payment_id) */
  @Get('webhook/mercadopago')
  async webhookMercadoPago(
    @Query('topic') topic: string,
    @Query('id') id: string,
  ): Promise<{ ok: boolean }> {
    if (topic !== 'payment' || !id) {
      return { ok: false };
    }
    try {
      const payment = await this.mercadopagoService.getPaymentById(id);
      if (!payment || payment.status !== 'approved') {
        return { ok: false };
      }
      const pedidoId = payment.external_reference;
      if (!pedidoId) return { ok: false };
      const confirmed = await this.pedidosService.confirmarPagoMercadoPago(
        Number(pedidoId),
      );
      this.logger.log(
        `Webhook MP: payment ${id} -> pedido ${pedidoId} confirmado=${confirmed}`,
      );
      return { ok: confirmed };
    } catch (err) {
      this.logger.warn(`Webhook MP error: ${err}`);
      return { ok: false };
    }
  }
}
