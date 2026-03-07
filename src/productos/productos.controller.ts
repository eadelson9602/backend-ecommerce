import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  /** UC3 - Ver catálogo (público) - datos desde base de datos */
  @Get()
  getCatalogo() {
    return this.productosService.getCatalogo();
  }

  /** UC4 - Filtrar productos (público) - datos desde base de datos */
  @Get('filtrar')
  filtrar(
    @Query('nombre') nombre?: string,
    @Query('talla') talla?: string,
    @Query('color') color?: string,
    @Query('marca') marca?: string,
    @Query('minPrecio') minPrecio?: string,
    @Query('maxPrecio') maxPrecio?: string,
  ) {
    return this.productosService.filtrar({
      nombre,
      talla,
      color,
      marca,
      minPrecio: minPrecio != null ? Number(minPrecio) : undefined,
      maxPrecio: maxPrecio != null ? Number(maxPrecio) : undefined,
    });
  }

  @Get('admin/listar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listarAdmin() {
    return this.productosService.getCatalogo();
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() body: { nombre: string; precio: number; talla?: string; color?: string; marca?: string; stock?: number; imagenUrl?: string | null }) {
    if (!body.nombre || body.precio == null) {
      throw new BadRequestException('Nombre y precio son obligatorios.');
    }
    return this.productosService.create(body);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() body: Partial<{ nombre: string; precio: number; talla: string; color: string; marca: string; stock: number; imagenUrl?: string | null }>) {
    return this.productosService.update(id, body);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  delete(@Param('id') id: string) {
    this.productosService.delete(id);
  }

  @Patch('admin/:id/inventario')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateInventario(@Param('id') id: string, @Body('cantidad') cantidad: number) {
    if (cantidad == null) throw new BadRequestException('cantidad es obligatoria.');
    return this.productosService.updateInventario(id, cantidad);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const p = await this.productosService.getById(id);
    if (!p) throw new NotFoundException('Producto no encontrado.');
    return p;
  }
}
