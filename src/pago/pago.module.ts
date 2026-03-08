import { Global, Module } from '@nestjs/common';
import { PagoService } from './pago.service';
import { PagoController } from './pago.controller';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { PedidosModule } from '../pedidos/pedidos.module';

@Global()
@Module({
  imports: [MercadoPagoModule, PedidosModule],
  controllers: [PagoController],
  providers: [PagoService],
  exports: [PagoService],
})
export class PagoModule {}
