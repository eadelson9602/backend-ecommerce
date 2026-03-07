# Prisma - Modelo según diagrama de clases

Modelos alineados con `bases_qinspecting/diagrama-clases.puml`:

- **Usuario** → `usuarios` (id, nombre, email, password_hash, rol)
- **Producto** → `productos` (id, nombre, precio, talla, color, marca, stock)
- **Carrito** → `carritos` (id, usuario_id) — 1:1 con Usuario
- **CarritoItem** → `carrito_items` — N:M Carrito–Producto (cantidad)
- **Pedido** → `pedidos` (id, usuario_id, total, estado)
- **PedidoItem** → `pedido_items` — líneas del pedido
- **Pago** → `pagos` (id, pedido_id, metodo, estado) — 1:1 con Pedido
- **Inventario** → `inventario` (producto_id, cantidad) — 1:1 con Producto

## Uso

1. Copiar `.env.example` a `.env` y definir `DATABASE_URL` (PostgreSQL).
2. Aplicar migraciones:
   ```bash
   yarn db:migrate
   # o: npx prisma migrate dev
   ```
3. (Opcional) Abrir Prisma Studio:
   ```bash
   yarn db:studio
   ```

El backend sigue usando por ahora el `StoreService` en memoria; para usar la base de datos hay que inyectar `PrismaService` en los servicios y sustituir las operaciones del store por consultas Prisma.
