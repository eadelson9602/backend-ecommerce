declare module '@prisma/client' {
  export class PrismaClient {
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    usuario: unknown;
    producto: unknown;
    carrito: unknown;
    carritoItem: unknown;
    pedido: unknown;
    pedidoItem: unknown;
    pago: unknown;
    inventario: unknown;
  }
}
