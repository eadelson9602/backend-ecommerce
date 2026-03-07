import { Module } from '@nestjs/common';
import { CarritoController } from './carrito.controller';
import { CarritoService } from './carrito.service';
import { ProductosModule } from '../productos/productos.module';

@Module({
  imports: [ProductosModule],
  controllers: [CarritoController],
  providers: [CarritoService],
  exports: [CarritoService],
})
export class CarritoModule {}
