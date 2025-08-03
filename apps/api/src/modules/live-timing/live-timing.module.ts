import { Module } from '@nestjs/common';
import { LiveTimingController } from './controllers/live-timing.controller';
import { LiveTimingService } from './services/live-timing.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * 라이브 타이밍 모듈
 * 라이브 타이밍 관련 기능을 제공하는 모듈입니다.
 */
@Module({
  imports: [PrismaModule],
  controllers: [LiveTimingController],
  providers: [LiveTimingService],
  exports: [LiveTimingService],
})
export class LiveTimingModule {}
