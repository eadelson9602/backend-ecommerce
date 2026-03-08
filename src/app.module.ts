import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductosModule } from './productos/productos.module';
import { CarritoModule } from './carrito/carrito.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { PagoModule } from './pago/pago.module';
import { MercadoPagoModule } from './mercadopago/mercadopago.module';

@Module({
  imports: [
    PrismaModule,
    PagoModule,
    MercadoPagoModule,
    AuthModule,
    ProductosModule,
    CarritoModule,
    PedidosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
