# Despliegue en Render (512 MB RAM)

Para que la API Nest funcione en un plan con **512 MB RAM** y **0.5 CPU**, sigue esta configuración.

---

## ⚠️ Start Command (obligatorio)

**En Render → tu servicio → Settings → Start Command** debe ser:

```bash
yarn start:prod:low-memory
```

**No uses `yarn start`.** Si usas `yarn start`, Render ejecuta `nest start`, que compila TypeScript en tiempo de ejecución y puede provocar **JavaScript heap out of memory**. Con `yarn start:prod:low-memory` se ejecuta el código ya compilado (`node dist/main.js`) con límite de heap 384 MB, dejando margen dentro de 512 MB.

**Alternativa:** Start Command `yarn start:prod` y en Environment la variable `NODE_OPTIONS` = `--max-old-space-size=384`.

---

## Build Command

**Con migraciones Prisma:**

```bash
yarn install --production=false && yarn prisma generate && yarn prisma migrate deploy && yarn build
```

**Solo build (sin migraciones en el build):**

```bash
yarn install --production=false && yarn build
```

(`--production=false` instala devDependencies necesarias para Prisma y compilación.)

---

## Causa del error "JavaScript heap out of memory"

- **No uses** `yarn start` en producción: ese comando ejecuta `nest start`, que compila TypeScript en tiempo de ejecución y consume mucha más memoria.
- Debes compilar en el **Build** y en el **Start** ejecutar solo el código ya compilado, con límite de heap.

## Variables de entorno

Configura en Render las que use tu app (base de datos, JWT, Mercado Pago, etc.). Ejemplos:

| Variable                    | Descripción                          |
| --------------------------- | ------------------------------------ |
| `DATABASE_URL`              | URL de conexión a la base de datos   |
| `JWT_SECRET`                | Secreto para tokens JWT              |
| `MERCADOPAGO_ACCESS_TOKEN`  | Token de Mercado Pago                |
| `PORT`                      | Lo asigna Render; no suele definirse |

## Resumen de cambios en el proyecto

1. **`start:prod:low-memory`** en `package.json`: ejecuta `node` con `--max-old-space-size=384` sobre el build (`dist/main.js`).

## Si sigues con OOM

- Revisa endpoints que devuelvan listas muy grandes (usa paginación).
- Considera subir a un plan con 1 GB RAM en Render si el tráfico crece.
