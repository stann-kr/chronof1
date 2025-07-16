import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // 글로벌 파이프 설정 (DTO 검증)
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Prisma 종료 훅 등록
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  // 포트 설정 및 시작
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`ChronoF1 API server started on port ${port}`);
}

bootstrap();
