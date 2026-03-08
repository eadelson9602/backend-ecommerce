import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import type { Usuario } from '../store/store.service';

@Controller('api/pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  /** UC6 - Realizar compra (checkout) - simulación */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async checkout(@CurrentUser() user: Usuario, @Body('metodoPago') metodoPago?: string) {
    return this.pedidosService.checkout(user, metodoPago ?? 'tarjeta');
  }

  /** Checkout Pro: crea preferencia y devuelve init_point para redirigir a Mercado Pago. */
  @Post('create-preference')
  @UseGuards(JwtAuthGuard)
  async createPreference(@CurrentUser() user: Usuario) {
    return this.pedidosService.createPreferenceForCheckout(user);
  }

  /** Webhook Checkout Pro: MP notifica aquí (GET con topic=payment&id=payment_id). */
  @Get('mercadopago-webhook')
  async mercadopagoWebhook(
    @Query('topic') topic: string,
    @Query('id') paymentId: string,
  ) {
    if (topic === 'payment' && paymentId) {
      await this.pedidosService.handleMercadoPagoWebhook(paymentId);
    }
    return { ok: true };
  }

  /** UC7 - Ver historial de pedidos */
  @Get('mis-pedidos')
  @UseGuards(JwtAuthGuard)
  getMisPedidos(@CurrentUser() user: Usuario) {
    return this.pedidosService.getMisPedidos(user);
  }

  /** UC10 - Ver pedidos (admin) */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getAdminPedidos() {
    return this.pedidosService.getAllPedidos();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.pedidosService.getById(id, user);
  }
}
