import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Precios en COP, imágenes fake (Unsplash)
const PRODUCTOS_FAKE = [
  { nombre: 'Zapatilla Running Pro', precio: 405000, talla: '40', color: 'Negro', marca: 'SportMax', stock: 45, imagenUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' },
  { nombre: 'Zapatilla Running Pro', precio: 405000, talla: '42', color: 'Negro', marca: 'SportMax', stock: 38, imagenUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' },
  { nombre: 'Zapatilla Running Pro', precio: 405000, talla: '44', color: 'Blanco', marca: 'SportMax', stock: 25, imagenUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80' },
  { nombre: 'Bota Casual Cuero', precio: 585000, talla: '39', color: 'Marrón', marca: 'UrbanStep', stock: 20, imagenUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80' },
  { nombre: 'Bota Casual Cuero', precio: 585000, talla: '41', color: 'Negro', marca: 'UrbanStep', stock: 30, imagenUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80' },
  { nombre: 'Sandalia Playa', precio: 157500, talla: '38', color: 'Azul', marca: 'BeachWear', stock: 60, imagenUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&q=80' },
  { nombre: 'Sandalia Playa', precio: 157500, talla: '40', color: 'Blanco', marca: 'BeachWear', stock: 55, imagenUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&q=80' },
  { nombre: 'Mocasín Clásico', precio: 360000, talla: '40', color: 'Negro', marca: 'ClassicFoot', stock: 22, imagenUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80' },
  { nombre: 'Mocasín Clásico', precio: 360000, talla: '42', color: 'Granate', marca: 'ClassicFoot', stock: 18, imagenUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80' },
  { nombre: 'Zapato Formal Oxford', precio: 720000, talla: '41', color: 'Negro', marca: 'Elegance', stock: 15, imagenUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80' },
  { nombre: 'Zapato Formal Oxford', precio: 720000, talla: '43', color: 'Negro', marca: 'Elegance', stock: 12, imagenUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80' },
  { nombre: 'Deportiva Urbana', precio: 297000, talla: '39', color: 'Gris', marca: 'StreetStyle', stock: 40, imagenUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80' },
  { nombre: 'Deportiva Urbana', precio: 297000, talla: '42', color: 'Blanco', marca: 'StreetStyle', stock: 35, imagenUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80' },
  { nombre: 'Chancla Unisex', precio: 90000, talla: '40', color: 'Negro', marca: 'Basic', stock: 100, imagenUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&q=80' },
  { nombre: 'Chancla Unisex', precio: 90000, talla: '42', color: 'Azul', marca: 'Basic', stock: 80, imagenUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&q=80' },
];

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);

  // Admin
  await prisma.usuario.upsert({
    where: { email: 'admin@tienda.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@tienda.com',
      passwordHash: adminHash,
      rol: 'admin',
    },
  });

  // Usuarios de ejemplo
  await prisma.usuario.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      nombre: 'María García',
      email: 'maria@example.com',
      passwordHash: userHash,
      rol: 'usuario',
    },
  });
  await prisma.usuario.upsert({
    where: { email: 'carlos@example.com' },
    update: {},
    create: {
      nombre: 'Carlos López',
      email: 'carlos@example.com',
      passwordHash: userHash,
      rol: 'usuario',
    },
  });

  // Productos e inventario (solo si no hay productos)
  const existing = await prisma.producto.count();
  if (existing === 0) {
    for (const p of PRODUCTOS_FAKE) {
      const prod = await prisma.producto.create({
        data: {
          nombre: p.nombre,
          precio: p.precio,
          talla: p.talla,
          color: p.color,
          marca: p.marca,
          stock: p.stock,
          imagenUrl: p.imagenUrl ?? null,
        },
      });
      await prisma.inventario.create({
        data: { productoId: prod.id, cantidad: p.stock },
      });
    }
  } else {
    // Asignar imágenes fake a productos existentes que no tengan imagen
    const sinImagen = await prisma.producto.findMany({ where: { imagenUrl: null }, orderBy: { id: 'asc' } });
    const urls = PRODUCTOS_FAKE.map((p) => p.imagenUrl).filter(Boolean) as string[];
    for (let i = 0; i < sinImagen.length; i++) {
      await prisma.producto.update({
        where: { id: sinImagen[i].id },
        data: { imagenUrl: urls[i % urls.length] },
      });
    }
    if (sinImagen.length > 0) {
      console.log(`Actualizadas ${sinImagen.length} imágenes en productos existentes.`);
    }
  }

  console.log('Seed completado: admin, usuarios y productos de ejemplo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
