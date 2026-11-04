import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin rewrites)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        'http://localhost:4200',
        'http://localhost:8100',
        'http://localhost:3000',
      ];
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('charlotte-wealth.com')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Charlotte Wealth API is running on http://0.0.0.0:${port}`);
}
await bootstrap();
