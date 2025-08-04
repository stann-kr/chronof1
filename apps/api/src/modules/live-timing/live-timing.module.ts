import { Module } from '@nestjs/common';
import { LiveTimingController } from './controllers/live-timing.controller';
import { LiveTimingService } from './services/live-timing.service';
import { LiveTimingGateway } from './websocket/gateways/live-timing.gateway';
import { ReplayService } from './services/replay.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * 라이브 타이밍 모듈
 * 라이브 타이밍 관련 기능을 제공하는 모듈입니다.
 * 
 * 포함 기능:
 * - REST API (세션, 이벤트, 드라이버 조회)
 * - WebSocket Gateway (실시간 타이밍 스트리밍)
 */
@Module({
  imports: [PrismaModule],
  controllers: [LiveTimingController],
  providers: [
    LiveTimingService,
    LiveTimingGateway,
    ReplayService, // 히스토리 데이터 재생 서비스 추가
  ],
  exports: [LiveTimingService, LiveTimingGateway, ReplayService],
})
export class LiveTimingModule {}
