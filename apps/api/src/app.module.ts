import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ResultsModule } from './modules/results/results.module';
import { LiveTimingModule } from './modules/live-timing/live-timing.module';
import { ConfigModule } from './config/config.module';
import { IngestModule } from './ingest/ingest.module';
import { RedisModule } from './redis/redis.module'; // Redis 모듈 추가

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule, // Redis 모듈 추가 - F1 데이터 초고속 캐싱
    ResultsModule,
    LiveTimingModule,
    IngestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
