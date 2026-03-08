import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CarritoService } from './carrito.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import type { Usuario } from '../store/store.service';

@Controller('api/carrito')
@UseGuards(JwtAuthGuard)
export class CarritoController {
  constructor(private readonly carritoService: CarritoService) {}

  /** UC5 - Agregar al carrito */
  @Post('agregar')
  agregar(
    @CurrentUser() user: Usuario,
    @Body('productoId') productoId: number,
    @Body('cantidad') cantidad: number = 1,
  ) {
    if (!productoId)
      throw new BadRequestException('productoId es obligatorio.');
    return this.carritoService.agregar(
      user,
      Number(productoId),
      Number(cantidad),
    );
  }

  @Get()
  getCarrito(@CurrentUser() user: Usuario) {
    return this.carritoService.getCarrito(user);
  }

  @Patch('item/:productoId')
  actualizarItem(
    @CurrentUser() user: Usuario,
    @Param('productoId') productoId: string,
    @Body('cantidad') cantidad: number,
  ) {
    return this.carritoService.actualizarItem(
      user,
      Number(productoId),
      Number(cantidad),
    );
  }
}
