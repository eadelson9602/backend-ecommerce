# Backend E-commerce

API REST de un sistema de comercio (tienda) construida con **NestJS**, **Prisma** y **PostgreSQL** (Supabase). Implementa los casos de uso de usuario, administrador y sistema de pago definidos en el diagrama de casos de uso del proyecto.

## Descripción del proyecto

Sistema backend para una tienda online que permite:

- **Usuarios:** registrarse, iniciar sesión, ver y filtrar catálogo, agregar al carrito, realizar compra y ver historial de pedidos.
- **Administradores:** gestionar productos, gestionar inventario y ver todos los pedidos.
- **Sistema de pago:** procesamiento de pago (integrado en el flujo de checkout).

El modelo de datos sigue el diagrama de clases (Usuario, Producto, Carrito, Pedido, Pago, Inventario). La persistencia puede usar **Prisma + PostgreSQL** (Supabase) o, sin base de datos configurada, un **Store en memoria** para desarrollo.

## Stack tecnológico

| Tecnología        | Uso                          |
|-------------------|------------------------------|
| **NestJS**        | Framework backend (Node.js)   |
| **TypeScript**    | Lenguaje                     |
| **Prisma**        | ORM y migraciones (PostgreSQL)|
| **PostgreSQL**    | Base de datos (Supabase)      |
| **Passport + JWT**| Autenticación                |
| **bcryptjs**      | Hash de contraseñas           |

## Arquitectura

```
src/
├── main.ts                 # Entrada, CORS, seed del Store
├── app.module.ts          # Módulo raíz
├── prisma/                # Cliente Prisma y conexión a PostgreSQL
├── store/                 # Almacén en memoria (fallback sin DB)
├── auth/                  # Registro, login, JWT, guards, roles (usuario/admin)
├── productos/             # Catálogo, filtros, CRUD e inventario (admin)
├── carrito/               # Carrito por usuario (agregar, ver, actualizar)
├── pedidos/               # Checkout, historial, listado admin
└── pago/                  # Servicio de procesamiento de pago (simulado)
```

- **Prisma:** conexión a la base de datos; si no está disponible, la app arranca igual y usa el Store en memoria.
- **Store:** datos en memoria con seed (admin + productos de ejemplo) para poder probar sin configurar DB.
- **Guards:** rutas protegidas con JWT; algunas solo para rol `admin`.

## Requisitos previos

- **Node.js** 18+ (recomendado 20+)
- **npm** o **yarn**
- (Opcional) Cuenta en **Supabase** para PostgreSQL en la nube

## Pasos para levantar el proyecto

### 1. Clonar e instalar dependencias

```bash
cd backend-ecommerce
yarn install
# o: npm install
```

### 2. Variables de entorno

Copia el ejemplo y ajusta los valores:

```bash
cp .env.example .env
```

Edita `.env` y configura al menos:

- `PORT` – Puerto del servidor (por defecto 3000).
- `JWT_SECRET` – Clave secreta para firmar los tokens JWT.
- Si usas **Supabase:** `DATABASE_URL` y `DIRECT_URL` (ver sección [Base de datos y migraciones](#base-de-datos-y-migraciones)).

Sin `DATABASE_URL` la aplicación arranca usando el Store en memoria.

### 3. Generar cliente Prisma (si usas base de datos)

```bash
yarn prisma generate
# o: npx prisma generate
```

### 4. Aplicar migraciones (solo si usas Supabase/PostgreSQL)

```bash
yarn db:migrate
# o: npx prisma migrate deploy
```

Para crear la base desde cero en desarrollo:

```bash
npx prisma migrate dev --name init
```

### 5. Iniciar el servidor

**Desarrollo (con recarga al cambiar código):**

```bash
yarn start:dev
# o: npm run start:dev
```

**Producción (compilado):**

```bash
yarn build
yarn start:prod
```

La API quedará disponible en `http://localhost:3000` (o el `PORT` que hayas puesto en `.env`).

### 6. Usuario de prueba (Store en memoria)

Si arrancas sin base de datos, el seed crea un administrador:

- **Email:** `admin@tienda.com`
- **Contraseña:** `admin123`

## Base de datos y migraciones

### Supabase (PostgreSQL)

El proyecto está preparado para usar **Supabase** con:

- **Connection pooling** (puerto 6543) en `DATABASE_URL` para la aplicación.
- **Conexión directa** (puerto 5432) en `DIRECT_URL` para las migraciones de Prisma.

En Supabase: **Project Settings → Database → Connection string**. Copia las dos URLs (pooler y directa), sustituye `[YOUR-PASSWORD]` por tu contraseña de base de datos y define en `.env`:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:TU_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.PROJECT_REF:TU_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
```

### Comandos Prisma útiles

| Comando | Descripción |
|---------|-------------|
| `yarn prisma generate` | Genera el cliente Prisma tras cambiar el schema. |
| `yarn db:migrate` / `npx prisma migrate dev` | Crea o aplica migraciones en desarrollo. |
| `npx prisma migrate deploy` | Aplica migraciones pendientes (producción o CI). |
| `yarn db:studio` | Abre Prisma Studio para ver/editar datos. |
| `yarn db:push` | Sincroniza el schema con la DB sin migraciones (solo desarrollo). |

### Modelo de datos (Prisma)

Entidades principales: **Usuario**, **Producto**, **Carrito**, **CarritoItem**, **Pedido**, **PedidoItem**, **Pago**, **Inventario**. El archivo `prisma/schema.prisma` y las migraciones en `prisma/migrations/` definen tablas y relaciones.

## API – Resumen de endpoints

Base URL: `http://localhost:3000`

| Caso de uso | Método | Ruta | Auth | Descripción |
|-------------|--------|------|------|-------------|
| Registrarse | POST | `/api/auth/registro` | No | Body: `nombre`, `email`, `password` |
| Iniciar sesión | POST | `/api/auth/login` | No | Body: `email`, `password` → devuelve `token` |
| Ver catálogo | GET | `/api/productos` | No | Lista de productos |
| Filtrar productos | GET | `/api/productos/filtrar` | No | Query: `nombre`, `talla`, `color`, `marca`, `minPrecio`, `maxPrecio` |
| Detalle producto | GET | `/api/productos/:id` | No | Un producto por id |
| Agregar al carrito | POST | `/api/carrito/agregar` | JWT | Body: `productoId`, `cantidad` |
| Ver carrito | GET | `/api/carrito` | JWT | Carrito del usuario |
| Realizar compra | POST | `/api/pedidos/checkout` | JWT | Body opcional: `metodoPago` |
| Historial de pedidos | GET | `/api/pedidos/mis-pedidos` | JWT | Pedidos del usuario |
| Ver pedido | GET | `/api/pedidos/:id` | JWT | Detalle (propietario o admin) |
| Gestionar productos (admin) | GET/POST/PUT/DELETE | `/api/productos/admin*` | JWT + admin | CRUD productos |
| Gestionar inventario (admin) | PATCH | `/api/productos/admin/:id/inventario` | JWT + admin | Body: `cantidad` |
| Ver todos los pedidos (admin) | GET | `/api/pedidos/admin` | JWT + admin | Listado completo |

Rutas protegidas: cabecera `Authorization: Bearer <token>`.

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `yarn start:dev` | Desarrollo con watch (incluye `prisma generate`). |
| `yarn start` | Inicia la app (incluye `prisma generate`). |
| `yarn start:prod` | Ejecuta el build de producción. |
| `yarn build` | Genera cliente Prisma y compila Nest. |
| `yarn db:migrate` | Migraciones en modo desarrollo. |
| `yarn db:studio` | Abre Prisma Studio. |
| `yarn db:push` | Push del schema a la DB (sin migraciones). |
| `yarn test` | Tests unitarios. |
| `yarn test:e2e` | Tests e2e. |
| `yarn lint` | Linter. |
| `yarn format` | Formato con Prettier. |

## Tests

```bash
# Unitarios
yarn test

# E2E
yarn test:e2e

# Cobertura
yarn test:cov
```

## Licencia

Proyecto de uso educativo. NestJS está bajo [licencia MIT](https://github.com/nestjs/nest/blob/master/LICENSE).
