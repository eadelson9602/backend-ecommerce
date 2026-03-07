import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { Usuario } from '../store/store.service';

@Controller('api/pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  /** UC6 - Realizar compra (checkout) */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async checkout(@CurrentUser() user: Usuario, @Body('metodoPago') metodoPago?: string) {
    return this.pedidosService.checkout(user, metodoPago ?? 'tarjeta');
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
