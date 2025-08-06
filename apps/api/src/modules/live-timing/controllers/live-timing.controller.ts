import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { LiveTimingService } from '../services/live-timing.service';
import { 
  SeasonDto, 
  EventDto, 
  SessionDto, 
  SessionDriverDto 
} from '../dto';

/**
 * 라이브 타이밍 컨트롤러
 * 라이브 타이밍 관련 REST API를 제공합니다.
 */
@ApiTags('라이브 타이밍')
@Controller('live-timing')
export class LiveTimingController {
  constructor(private readonly liveTimingService: LiveTimingService) {}

  /**
   * 모든 시즌 목록을 조회합니다.
   */
  @Get('seasons')
  @ApiOperation({
    summary: '시즌 목록 조회',
    description: 'F1 시즌 목록을 최신 순으로 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '시즌 목록 조회 성공',
    type: [SeasonDto],
  })
  async getSeasons(): Promise<SeasonDto[]> {
    return await this.liveTimingService.getAllSeasons();
  }

  /**
   * WebSocket 연결 정보를 제공합니다.
   */
  @Get('websocket-info')
  @ApiOperation({
    summary: 'WebSocket 연결 정보',
    description: `
    라이브 타이밍 WebSocket 연결 방법과 사용법을 안내합니다.
    
    **연결 URL**: ws://localhost:3000/live-timing
    
    **지원 메시지**:
    
    1. **세션 참가**: 
       \`\`\`json
       {
         "event": "join-session",
         "data": { "sessionId": 1 }
       }
       \`\`\`
    
    2. **재생 제어**:
       \`\`\`json
       {
         "event": "replay-control", 
         "data": {
           "type": "START|PAUSE|STOP|SEEK",
           "sessionId": 1,
           "speed": 1,
           "timestamp": 30
         }
       }
       \`\`\`
    
    **수신 메시지**:
    - \`CONNECTION_STATUS\`: 연결 상태
    - \`SESSION_INFO\`: 세션 정보
    - \`TIMING_UPDATE\`: 실시간 타이밍 데이터
    - \`ERROR\`: 에러 메시지
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'WebSocket 연결 정보',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'ws://localhost:3000/live-timing' },
        protocol: { type: 'string', example: 'Socket.IO' },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              example: { type: 'object' }
            }
          }
        }
      }
    }
  })
  getWebSocketInfo() {
    return {
      url: 'ws://localhost:3000/live-timing',
      protocol: 'Socket.IO',
      events: [
        {
          name: 'join-session',
          description: '특정 세션에 참가하여 타이밍 데이터 수신 시작',
          example: { sessionId: 1 }
        },
        {
          name: 'replay-control',
          description: '재생 제어 (시작/일시정지/정지/탐색)',
          example: { type: 'START', sessionId: 1, speed: 1 }
        }
      ],
      responses: [
        {
          name: 'message',
          description: '서버에서 클라이언트로 전송되는 모든 메시지',
          types: ['CONNECTION_STATUS', 'SESSION_INFO', 'TIMING_UPDATE', 'ERROR']
        }
      ]
    };
  }

  /**
   * 특정 연도의 이벤트 목록을 조회합니다.
   */
  @Get('seasons/:year/events')
  @ApiOperation({
    summary: '연도별 이벤트 목록 조회',
    description: '특정 연도의 F1 그랑프리 이벤트 목록을 조회합니다. 라이브 타이밍 지원 여부도 함께 제공됩니다.',
  })
  @ApiParam({
    name: 'year',
    description: '조회할 연도',
    example: 2025,
    type: 'integer',
  })
  @ApiResponse({
    status: 200,
    description: '이벤트 목록 조회 성공',
    type: [EventDto],
  })
  @ApiResponse({
    status: 404,
    description: '해당 연도의 이벤트가 없음',
  })
  async getEventsByYear(
    @Param('year', ParseIntPipe) year: number,
  ): Promise<EventDto[]> {
    const events = await this.liveTimingService.getEventsByYear(year);
    
    if (events.length === 0) {
      throw new NotFoundException(`${year}년도의 이벤트를 찾을 수 없습니다.`);
    }
    
    return events;
  }

  /**
   * 특정 이벤트의 세션 목록을 조회합니다.
   */
  @Get('events/:eventId/sessions')
  @ApiOperation({
    summary: '이벤트별 세션 목록 조회',
    description: '특정 이벤트(그랑프리)의 세션 목록을 조회합니다. 각 세션의 라이브 데이터 유무도 함께 제공됩니다.',
  })
  @ApiParam({
    name: 'eventId',
    description: '이벤트 ID',
    example: 1,
    type: 'integer',
  })
  @ApiResponse({
    status: 200,
    description: '세션 목록 조회 성공',
    type: [SessionDto],
  })
  @ApiResponse({
    status: 404,
    description: '해당 이벤트의 세션이 없음',
  })
  async getSessionsByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<SessionDto[]> {
    const sessions = await this.liveTimingService.getSessionsByEvent(eventId);
    
    if (sessions.length === 0) {
      throw new NotFoundException(`이벤트 ID ${eventId}의 세션을 찾을 수 없습니다.`);
    }
    
    return sessions;
  }

  /**
   * 특정 세션의 드라이버 목록을 조회합니다.
   */
  @Get('sessions/:sessionId/drivers')
  @ApiOperation({
    summary: '세션별 드라이버 목록 조회',
    description: '특정 세션에 참가한 드라이버 목록과 기본 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'sessionId',
    description: '세션 ID',
    example: 1,
    type: 'integer',
  })
  @ApiResponse({
    status: 200,
    description: '드라이버 목록 조회 성공',
    type: [SessionDriverDto],
  })
  @ApiResponse({
    status: 404,
    description: '해당 세션의 드라이버가 없음',
  })
  async getDriversBySession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<SessionDriverDto[]> {
    const drivers = await this.liveTimingService.getDriversBySession(sessionId);
    
    if (drivers.length === 0) {
      throw new NotFoundException(`세션 ID ${sessionId}의 드라이버를 찾을 수 없습니다.`);
    }
    
    return drivers;
  }

  /**
   * 특정 세션의 라이브 타이밍 데이터 유무를 확인합니다.
   */
  @Get('sessions/:sessionId/live-status')
  @ApiOperation({
    summary: '라이브 타이밍 데이터 유무 확인',
    description: '특정 세션이 라이브 타이밍 데이터를 가지고 있는지 확인합니다.',
  })
  @ApiParam({
    name: 'sessionId',
    description: '세션 ID',
    example: 1,
    type: 'integer',
  })
  @ApiResponse({
    status: 200,
    description: '라이브 데이터 유무 확인 완료',
    schema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'number',
          description: '세션 ID',
          example: 1,
        },
        hasLiveData: {
          type: 'boolean',
          description: '라이브 데이터 유무',
          example: true,
        },
      },
    },
  })
  async getLiveTimingStatus(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<{ sessionId: number; hasLiveData: boolean }> {
    const hasLiveData = await this.liveTimingService.hasLiveTimingData(sessionId);
    
    return {
      sessionId,
      hasLiveData,
    };
  }
}
