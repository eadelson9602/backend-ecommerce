import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StoreService } from './store/store.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const store = app.get(StoreService);
  await store.seed();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
