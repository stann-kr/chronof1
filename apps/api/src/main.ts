import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
  app.setGlobalPrefix('api');

  // Swagger 문서화 설정
  const config = new DocumentBuilder()
    .setTitle('ChronoF1 API')
    .setDescription('Historic Formula 1 & Live Timing API 문서')
    .setVersion('1.0')
    .addTag('레이스 결과')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 포트 설정 및 시작
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`ChronoF1 API server started on port ${port}`);
  console.log(`Swagger 문서: http://localhost:${port}/api/docs`);
}

bootstrap();
