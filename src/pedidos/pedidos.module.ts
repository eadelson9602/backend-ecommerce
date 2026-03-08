import { Module } from '@nestjs/common';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { ProductosModule } from '../productos/productos.module';

@Module({
  imports: [MercadoPagoModule, ProductosModule],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService],
})
export class PedidosModule {}
