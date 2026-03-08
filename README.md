# Backend E-commerce

API REST de una tienda online construida con **NestJS**, **Prisma** y **PostgreSQL** (Supabase). Incluye autenticación JWT, catálogo de productos, carrito, pedidos y pago con **Mercado Pago (Checkout Pro)**.

---

## ¿Qué hace este proyecto?

Backend de un e-commerce que permite:

- **Usuarios:** registrarse, iniciar sesión, ver y filtrar catálogo, gestionar carrito, iniciar checkout con Mercado Pago y ver historial de pedidos.
- **Administradores:** CRUD de productos, gestión de inventario y listado de todos los pedidos.
- **Pagos:** integración con **Mercado Pago Checkout Pro**: se crea una preferencia, el usuario es redirigido a Mercado Pago para pagar y, al volver (o vía webhook), se confirma el pedido.

El modelo de datos incluye: **Usuario**, **Producto**, **Carrito** / **CarritoItem**, **Pedido** / **PedidoItem**, **Pago**, **Inventario**. La persistencia usa **Prisma + PostgreSQL** (p. ej. Supabase). Sin `DATABASE_URL` configurada, la app puede arrancar con un **Store en memoria** (fallback para desarrollo).

---

## Stack tecnológico

| Tecnología        | Uso                              |
|-------------------|----------------------------------|
| **NestJS**        | Framework backend (Node.js)      |
| **TypeScript**    | Lenguaje                         |
| **Prisma**        | ORM y migraciones (PostgreSQL)   |
| **PostgreSQL**    | Base de datos (Supabase)         |
| **Passport + JWT**| Autenticación                    |
| **bcryptjs**      | Hash de contraseñas              |
| **Mercado Pago**  | Pagos (Checkout Pro, SDK Node)   |

---

## Arquitectura del código

```
src/
├── main.ts                    # Entrada, CORS
├── app.module.ts              # Módulo raíz
├── prisma/                    # Cliente Prisma (PostgreSQL)
├── store/                      # Store en memoria (fallback sin DB)
├── auth/                      # Registro, login, JWT, guards, roles (usuario | admin)
├── productos/                  # Catálogo, filtros, CRUD e inventario (admin)
├── carrito/                    # Carrito por usuario (agregar, ver, actualizar ítems)
├── pedidos/                    # Checkout simulado, Checkout Pro (preferencia + webhook), historial, admin
├── pago/                       # Detalle de pago MP (para página failure) y webhook alternativo
└── mercadopago/                # Servicio Mercado Pago: preferencias, pagos, errores
```

- **Prisma:** conexión a la base de datos; si no está disponible, la app puede usar el Store en memoria.
- **Guards:** rutas protegidas con JWT; varias solo para rol `admin`.
- **Checkout Pro:** el frontend llama `POST /api/pedidos/create-preference` → el backend crea pedido + preferencia MP → devuelve `initPoint` → el usuario es redirigido a Mercado Pago. Tras el pago, MP redirige a success/failure/pending o notifica al webhook para confirmar el pedido.

### Estilo arquitectónico: en capas y modular

Este proyecto está construido con una **arquitectura en capas** y **modular** porque permite separar responsabilidades sin añadir complejidad innecesaria y se alinea con la forma en que NestJS organiza las aplicaciones.

**Arquitectura en capas**

El flujo de una petición sigue tres capas bien definidas:

1. **Capa de presentación (entrada):** los **controladores** reciben las peticiones HTTP, extraen body/query/params y delegan en los servicios. No contienen lógica de negocio.
2. **Capa de lógica de negocio (aplicación):** los **servicios** orquestan las operaciones, validan reglas (stock, carrito vacío, permisos) y coordinan persistencia e integraciones. Aquí vive la lógica del dominio (crear pedido, preferencia de pago, confirmar pago, etc.).
3. **Capa de datos e infraestructura:** el acceso a la base de datos se hace mediante **Prisma** (inyectado como `PrismaService`), y las integraciones externas (Mercado Pago) se encapsulan en **servicios de infraestructura** (`MercadoPagoService`) que los demás servicios usan por inyección. No existe una capa de “repositorios” separada: los servicios llaman al ORM directamente, lo que simplifica el código en un proyecto de este tamaño.

Así se consigue una separación clara entre “quién recibe la petición”, “quién decide qué hacer” y “quién persiste o llama a terceros”, sin añadir capas adicionales (por ejemplo, repositorios o casos de uso) que en este contexto no aportan aún.

**Arquitectura modular**

El backend está dividido por **módulos por funcionalidad** (auth, productos, carrito, pedidos, pago, mercadopago, prisma). Cada módulo agrupa su controlador y sus servicios, y expone solo lo que otros módulos necesitan (por ejemplo, `ProductosService` se exporta para que Carrito y Pedidos lo usen). Las dependencias entre módulos se resuelven por **inyección de dependencias**: por ejemplo, `PedidosService` recibe `PrismaService`, `MercadoPagoService` y `ProductosService` en el constructor.

Esta organización modular facilita localizar dónde está cada caso de uso (auth en auth, carrito en carrito, checkout en pedidos), favorece el mantenimiento y permite crecer o refactorizar un módulo con menor impacto en el resto. No se ha aplicado arquitectura hexagonal (puertos/adaptadores) ni Clean Architecture (dominio aislado, casos de uso explícitos) de forma estricta; el objetivo ha sido un equilibrio entre claridad, mantenibilidad y simplicidad adecuado al alcance del proyecto.

### Patrones de diseño utilizados

| Patrón | Dónde se usa | Para qué sirve |
|--------|----------------|----------------|
| **Arquitectura en capas** | Controladores → Servicios → Prisma / integraciones | Separar entrada HTTP, lógica de negocio y persistencia/APIs externas. |
| **Módulo (por funcionalidad)** | `AuthModule`, `ProductosModule`, `PedidosModule`, etc. | Agrupar controlador, servicios y dependencias por dominio; exponer solo lo necesario. |
| **Inyección de dependencias (DI)** | `@Injectable()`, constructor con `PrismaService`, `JwtService`, `MercadoPagoService` | Nest resuelve las dependencias; facilita tests y sustitución de implementaciones. |
| **Capa de servicios (Service Layer)** | `AuthService`, `PedidosService`, `ProductosService`, `MercadoPagoService` | Concentrar la lógica de negocio y orquestar acceso a datos e integraciones. |
| **Strategy** | `JwtStrategy` (Passport) | Definir cómo se valida el JWT y se obtiene el usuario en cada petición autenticada. |
| **Guard (cadena de responsabilidad)** | `JwtAuthGuard`, `RolesGuard` | Proteger rutas: primero validar JWT, luego comprobar rol (ej. `@Roles('admin')`). |
| **Decorator (metadatos)** | `@Roles('admin')` con `SetMetadata` | Marcar controladores/métodos con requisitos (roles) que el `RolesGuard` lee con `Reflector`. |
| **Adapter / Wrapper de servicio externo** | `MercadoPagoService`, `StoreService` | Encapsular el SDK de Mercado Pago y la persistencia en memoria; el resto del código no depende del detalle. |
| **Singleton (por módulo)** | Servicios y guards registrados en módulos | Una única instancia por servicio en la app; Nest lo gestiona con su contenedor de DI. |

---

## Requisitos previos

- **Node.js** 18+ (recomendado 20+)
- **Yarn** o npm
- (Opcional) Cuenta **Supabase** para PostgreSQL
- (Opcional) Cuenta **Mercado Pago** para pagos reales

---

## Variables de entorno

Copia el ejemplo y ajusta:

```bash
cp .env.example .env
```

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `PORT` | No | Puerto del servidor (default `3000`) |
| `JWT_SECRET` | Sí | Clave para firmar tokens JWT |
| `NODE_ENV` | No | `development` \| `production` |
| `DATABASE_URL` | Sí* | URL PostgreSQL (pooling, p. ej. Supabase puerto 6543) |
| `DIRECT_URL` | Sí* | URL PostgreSQL directa para migraciones (puerto 5432) |
| `MERCADOPAGO_ACCESS_TOKEN` | Sí** | Token de acceso de Mercado Pago |
| `MERCADOPAGO_FRONTEND_URL` | No | Base del frontend (default `http://localhost:5173`) |
| `MERCADOPAGO_SUCCESS_URL` | No | URL de éxito (default `{FRONTEND_URL}/checkout/success`) |
| `MERCADOPAGO_FAILURE_URL` | No | URL de fallo (default `{FRONTEND_URL}/checkout/failure`) |
| `MERCADOPAGO_PENDING_URL` | No | URL de pendiente (default `{FRONTEND_URL}/checkout/pending`) |
| `MERCADOPAGO_NOTIFICATION_URL` | No | URL completa del webhook (ej. `https://tu-api.com/api/pedidos/mercadopago-webhook`); MP la llama en GET. En local suele dejarse vacía. |
| `MERCADOPAGO_TEST_PAYER_EMAIL` | No | En sandbox MP exige email con `@testuser.com`; define uno aquí si hace falta |

\* Sin `DATABASE_URL` la app arranca con Store en memoria.  
\** Necesario para Checkout Pro; en desarrollo puedes usar token de prueba.

---

## Comandos

### Instalación y generación de cliente Prisma

```bash
yarn install
yarn prisma generate
```

### Base de datos

| Comando | Descripción |
|---------|-------------|
| `yarn db:migrate` | Crea/aplica migraciones en desarrollo (`prisma migrate dev`) |
| `yarn prisma migrate deploy` | Aplica migraciones pendientes (producción/CI) |
| `yarn db:studio` | Abre Prisma Studio |
| `yarn db:push` | Sincroniza schema con la DB sin migraciones (solo desarrollo) |
| `yarn db:seed` | Ejecuta el seed (usuarios + productos de ejemplo) |

### Servidor

| Comando | Descripción |
|---------|-------------|
| `yarn start:dev` | Desarrollo con watch (incluye `prisma generate`) |
| `yarn start` | Inicia la app (incluye `prisma generate`) |
| `yarn start:prod` | Ejecuta el build compilado (`node dist/main.js`) |
| `yarn start:prod:low-memory` | Igual que prod con límite de heap 384 MB (para planes 512 MB, ver [docs/RENDER.md](docs/RENDER.md)) |

### Build y calidad

| Comando | Descripción |
|---------|-------------|
| `yarn build` | Genera cliente Prisma y compila Nest (`dist/`) |
| `yarn lint` | Linter |
| `yarn format` | Formato con Prettier |
| `yarn test` | Tests unitarios |
| `yarn test:e2e` | Tests e2e |
| `yarn test:cov` | Cobertura |

---

## Pasos para levantar el proyecto

### 1. Instalar dependencias

```bash
cd backend-ecommerce
yarn install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y define al menos `JWT_SECRET` y, si usas base de datos, `DATABASE_URL` y `DIRECT_URL`. Para Mercado Pago, `MERCADOPAGO_ACCESS_TOKEN`.

### 3. Base de datos (Supabase / PostgreSQL)

En Supabase: **Project Settings → Database**. Usa la connection string con pooler (puerto 6543) para `DATABASE_URL` y la directa (5432) para `DIRECT_URL`.

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:TU_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.PROJECT_REF:TU_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
```

### 4. Migraciones y seed

```bash
yarn prisma generate
yarn db:migrate
yarn db:seed
```

### 5. Iniciar

```bash
yarn start:dev
```

API en `http://localhost:3000` (o el `PORT` de `.env`).

### 6. Usuarios de prueba (tras ejecutar el seed)

Después de `yarn db:seed`, puedes iniciar sesión en la aplicación (frontend o con `POST /api/auth/login`) con estos usuarios:

| Rol     | Email              | Contraseña | Uso |
|---------|--------------------|------------|-----|
| Admin   | `admin@tienda.com` | `admin123` | Acceso al panel de administración (productos, pedidos, usuarios). |
| Usuario | `maria@example.com`| `user123`  | Compras, carrito, checkout, historial de pedidos. |
| Usuario | `carlos@example.com` | `user123` | Mismo que María; útil para probar con otra cuenta. |

Todos pueden probar el catálogo, carrito y checkout con Mercado Pago usando cualquiera de estas cuentas.

---

## Migraciones

Las migraciones están en `prisma/migrations/`. Cada carpeta contiene un `migration.sql`.

- **Desarrollo:** `yarn db:migrate` (crea migraciones con `prisma migrate dev`).
- **Producción:** `yarn prisma migrate deploy` (solo aplica; no crea nuevas).

Después de cambiar `prisma/schema.prisma`:

```bash
yarn prisma migrate dev --name descripcion_cambio
```

---

## Seed (datos iniciales)

El seed (`prisma/seed.ts`) se ejecuta con:

```bash
yarn db:seed
```

Crea o actualiza:

- **Usuarios:** administrador y dos usuarios de prueba (emails y contraseñas en la sección [Usuarios de prueba](#6-usuarios-de-prueba-tras-ejecutar-el-seed)).
- **Productos:** lista de calzado de ejemplo (precios en COP, imágenes Unsplash) y registros en **Inventario**. Si ya existen productos, solo actualiza imágenes donde falten.

Configuración en `package.json`:

```json
"prisma": {
  "seed": "ts-node -P prisma/tsconfig.json prisma/seed.ts"
}
```

---

## API – Endpoints principales

Base URL: `http://localhost:3000`

### Auth

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/registro` | No | Body: `nombre`, `email`, `password` |
| POST | `/api/auth/login` | No | Body: `email`, `password` → `token` |

### Productos (público)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/productos` | Catálogo |
| GET | `/api/productos/filtrar` | Query: `nombre`, `talla`, `color`, `marca`, `minPrecio`, `maxPrecio` |
| GET | `/api/productos/:id` | Detalle producto |

### Carrito (JWT)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/carrito` | Carrito del usuario |
| POST | `/api/carrito/agregar` | Body: `productoId`, `cantidad` |
| PUT | `/api/carrito/item/:productoId` | Actualizar cantidad; Body: `cantidad` |
| DELETE | `/api/carrito/item/:productoId` | Quitar ítem |

### Pedidos (JWT)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/pedidos/checkout` | Checkout simulado (body opcional: `metodoPago`) |
| POST | `/api/pedidos/create-preference` | **Checkout Pro:** crea pedido + preferencia MP; devuelve `{ pedidoId, initPoint }` |
| GET | `/api/pedidos/mercadopago-webhook` | Webhook MP: `?topic=payment&id=payment_id` (sin JWT) |
| GET | `/api/pedidos/mis-pedidos` | Historial del usuario |
| GET | `/api/pedidos/:id` | Detalle pedido (propietario o admin) |
| GET | `/api/pedidos/admin` | Todos los pedidos (admin) |

### Pagos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/pagos/detalle?payment_id=xxx` | Detalle de pago MP (para página failure) |

### Productos admin (JWT + admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/productos/admin/listar` | Listado completo |
| POST | `/api/productos/admin` | Crear producto |
| PUT | `/api/productos/admin/:id` | Actualizar producto |
| DELETE | `/api/productos/admin/:id` | Eliminar producto |
| PATCH | `/api/productos/admin/:id/inventario` | Body: `cantidad` |

Rutas protegidas: cabecera `Authorization: Bearer <token>`.

---

## Despliegue (poca memoria, p. ej. Render 512 MB)

Para planes con **512 MB RAM** usa el script de bajo consumo y no ejecutes `nest start` en producción. Detalle en **[docs/RENDER.md](docs/RENDER.md)**.

Resumen:

- **Start Command:** `yarn start:prod:low-memory`
- **Build:** compilar en el paso de build y en start solo ejecutar `node dist/main.js` con `--max-old-space-size=384`.

---

## Modelo de datos (Prisma)

Entidades: **Usuario**, **Carrito**, **CarritoItem**, **Producto**, **Inventario**, **Pedido**, **PedidoItem**, **Pago**. Relaciones y tablas en `prisma/schema.prisma` y en las migraciones bajo `prisma/migrations/`.

---

## Licencia

Proyecto de uso educativo. NestJS bajo [licencia MIT](https://github.com/nestjs/nest/blob/master/LICENSE).
