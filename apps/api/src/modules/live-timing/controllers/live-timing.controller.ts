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
    
    **F1 청크 기반 라이브 타이밍 시스템**
    
    **클라이언트 → 서버 메시지**:
    
    1. **세션 참가**: 
       \`\`\`json
       {
         "event": "join-session",
         "data": { "sessionKey": "2024_03_02_Bahrain_Grand_Prix_Race" }
       }
       \`\`\`
    
    2. **재생 제어**:
       \`\`\`json
       {
         "event": "replay-control", 
         "data": {
           "type": "START|PAUSE|STOP|SEEK",
           "sessionKey": "2024_03_02_Bahrain_Grand_Prix_Race",
           "speed": 1,
           "timestamp": 30
         }
       }
       \`\`\`
    
    **서버 → 클라이언트 메시지**:
    
    ### 📦 청크 데이터 (30초마다)
    - **이벤트**: \`chunk-data\`
    - **타입**: \`CHUNK_DATA\`
    - **설명**: 120초 분량의 타이밍 데이터 청크
    - **주기**: 30초마다 전송
    
    ### 📍 재생 위치 (1초마다)
    - **이벤트**: \`playback-position\`
    - **타입**: \`PLAYBACK_POSITION\`
    - **설명**: 현재 재생 시간과 속도
    - **주기**: 1초마다 전송
    
    ### ⏱️ 기존 타이밍 (호환성)
    - **이벤트**: \`timing-update\` / \`message\`
    - **타입**: \`TIMING_UPDATE\`
    - **설명**: 기존 방식의 실시간 타이밍 데이터
    
    ### 🔧 기타 메시지
    - \`CONNECTION_STATUS\`: 연결 상태
    - \`SESSION_INFO\`: 세션 정보  
    - \`ERROR\`: 에러 메시지
    
    **💡 프론트엔드 구현 가이드**:
    1. **청크 캐싱**: \`chunk-data\`를 Map으로 캐시
    2. **100ms 업데이트**: \`requestAnimationFrame\`으로 부드러운 UI
    3. **위치 동기화**: \`playback-position\`으로 현재 시간 추적
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
        architecture: { type: 'string', example: 'Chunk-based F1 Live Timing' },
        chunkSystem: {
          type: 'object',
          properties: {
            chunkDuration: { type: 'number', example: 120, description: '청크 지속시간 (초)' },
            transmissionInterval: { type: 'number', example: 30, description: '전송 주기 (초)' },
            uiUpdateInterval: { type: 'number', example: 100, description: 'UI 업데이트 간격 (밀리초)' }
          }
        },
        clientEvents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              example: { type: 'object' }
            }
          }
        },
        serverEvents: {
          type: 'array', 
          items: {
            type: 'object',
            properties: {
              event: { type: 'string' },
              type: { type: 'string' },
              frequency: { type: 'string' },
              description: { type: 'string' },
              dataStructure: { type: 'object' }
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
      architecture: 'Chunk-based F1 Live Timing',
      
      // 🚀 청크 시스템 설정
      chunkSystem: {
        chunkDuration: 120, // 120초 청크
        transmissionInterval: 30, // 30초마다 전송
        uiUpdateInterval: 100, // 100ms UI 업데이트
      },
      
      // 클라이언트 → 서버 이벤트
      clientEvents: [
        {
          name: 'join-session',
          description: '특정 세션에 참가하여 청크 데이터 수신 시작',
          example: { sessionKey: '2024_03_02_Bahrain_Grand_Prix_Race' }
        },
        {
          name: 'replay-control',
          description: '재생 제어 (시작/일시정지/정지/탐색)',
          example: { 
            type: 'START', 
            sessionKey: '2024_03_02_Bahrain_Grand_Prix_Race', 
            speed: 1,
            timestamp: 30
          }
        }
      ],
      
      // 서버 → 클라이언트 이벤트
      serverEvents: [
        {
          event: 'chunk-data',
          type: 'CHUNK_DATA',
          frequency: '30초마다',
          description: '120초 분량의 상세 F1 라이브 타이밍 데이터 청크',
          dataStructure: {
            chunkIndex: 1,
            startTime: 0,
            endTime: 120,
            data: {
              drivers: [
                {
                  driverSessionId: 1,
                  carNumber: 4,
                  position: 1,
                  lapNumber: 1,
                  
                  // 🏁 타이밍 데이터
                  currentLapTime: 93456,  // 1:33.456 (밀리초)
                  bestLapTime: 91234,     // 1:31.234 (밀리초)
                  lastLapTime: 92500,     // 1:32.500 (밀리초)
                  sector1Time: 28123,     // 28.123초 (밀리초)
                  sector2Time: 31456,     // 31.456초 (밀리초)
                  sector3Time: 32877,     // 32.877초 (밀리초)
                  sector1Best: 27890,     // 세션 내 최고 기록
                  sector2Best: 31100,     // 세션 내 최고 기록
                  sector3Best: 32244,     // 세션 내 최고 기록
                  
                  // 🚗 차량 텔레메트리
                  speed: 298.5,           // km/h
                  throttle: 89.5,         // %
                  brake: 0,               // %
                  gear: 7,                // 기어 (0=N, 1-8)
                  rpm: 11750.5,           // RPM
                  drs: 2,                 // 0=불가, 1=가능, 2=활성
                  
                  // 📍 위치 및 상태
                  status: "Finished",     // Driving/Finished/Retired/DNF
                  distanceToDriverAhead: 1.245, // 미터
                  positionData: {
                    x: -1046.235,         // 트랙 X 좌표
                    y: -1475.761,         // 트랙 Y 좌표  
                    z: 86.000,            // 고도
                    angle: 45.5           // 진행 방향 (도)
                  },
                  
                  // 🏎️ 타이어 정보
                  tireCompound: "SOFT",   // SOFT/MEDIUM/HARD/INTERMEDIATE/WET
                  tireAge: 12,            // 랩 수
                  
                  // 👤 드라이버 정보
                  driver: {
                    id: 1,
                    number: 4,
                    code: "NOR",
                    fullName: "Lando Norris"
                  },
                  
                  // 🏁 팀 정보
                  team: {
                    id: 1,
                    name: "McLaren",
                    shortName: "MCL",
                    color: "#FF8700"
                  }
                }
              ]
            }
          }
        },
        {
          event: 'playback-position',
          type: 'PLAYBACK_POSITION', 
          frequency: '1초마다',
          description: '현재 재생 시간과 속도 정보',
          dataStructure: {
            currentTime: 145.523,      // 세션 시작 후 경과 시간 (초)
            speed: 1.5,                // 재생 속도 (1x = 1, 2x = 2)
            isPlaying: true,           // 재생 상태
            sessionId: 1,              // 세션 ID
            sessionStatus: "active"    // active/paused/stopped/completed
          }
        },
        {
          event: 'timing-update',
          type: 'TIMING_UPDATE',
          frequency: '가변 (호환성)',
          description: '기존 방식의 실시간 F1 타이밍 데이터 - 모든 드라이버 정보 포함',
          dataStructure: {
            type: "TIMING_UPDATE",
            sessionId: 1,
            sessionTime: 145.523,       // 세션 경과 시간 (초)
            currentLap: 15,             // 현재 랩 번호
            sessionStatus: "active",    // active/paused/completed
            drivers: [
              {
                driverSessionId: 1,
                carNumber: 4,
                position: 1,
                lapNumber: 15,
                currentLapTime: 88456,    // 현재 랩 타임 (밀리초)
                bestLapTime: 87234,       // 베스트 랩 (밀리초)
                lastLapTime: 88901,       // 이전 랩 타임
                sector1Time: 27123,       // 1구간 타임
                sector2Time: 29456,       // 2구간 타임
                sector3Time: 31877,       // 3구간 타임
                speed: 315.8,             // 현재 속도 (km/h)
                throttle: 95.2,           // 스로틀 (%)
                brake: 0,                 // 브레이크 (%)
                gear: 8,                  // 기어
                rpm: 12450.7,             // RPM
                drs: 1,                   // DRS 상태
                status: "Driving",        // 드라이버 상태
                distanceToDriverAhead: 0.892, // 앞차와 거리
                positionData: { x: -1200.5, y: -800.3, z: 95.2 },
                driver: { id: 1, number: 4, code: "NOR", fullName: "Lando Norris" },
                team: { id: 1, name: "McLaren", shortName: "MCL" }
              }
            ]
          }
        },
        {
          event: 'message', 
          type: 'CONNECTION_STATUS|SESSION_INFO|ERROR',
          frequency: '이벤트 기반',
          description: '연결 상태, 세션 정보, 에러 메시지',
          dataStructure: {
            // CONNECTION_STATUS 예시
            type: 'CONNECTION_STATUS',
            status: 'connected',
            message: '바레인 그랑프리 레이스 세션에 성공적으로 연결되었습니다',
            sessionKey: '2024_03_02_Bahrain_Grand_Prix_Race',
            timestamp: '2024-03-02T15:00:00Z',
            
            // SESSION_INFO 예시 (선택사항)
            sessionInfo: {
              sessionId: 1,
              sessionName: "Race",
              eventName: "Bahrain Grand Prix",
              year: 2024,
              trackName: "Bahrain International Circuit",
              totalDrivers: 20,
              sessionDuration: 7200, // 초
              weather: {
                trackTemp: 42.5,      // °C
                airTemp: 38.2,        // °C
                humidity: 45,         // %
                windSpeed: 12.3       // km/h
              }
            },
            
            // ERROR 예시 (선택사항)
            error: {
              code: "SESSION_NOT_FOUND",
              message: "요청한 세션을 찾을 수 없습니다",
              details: "세션 키를 확인하고 다시 시도하세요"
            }
          }
        }
      ],
      
      // 💡 프론트엔드 구현 가이드
      implementationGuide: {
        chunkCaching: 'Map 자료구조로 청크 데이터 캐싱',
        uiUpdates: 'requestAnimationFrame으로 100ms 간격 부드러운 업데이트',
        dataFlow: '서버는 30초마다 청크 전송, 클라이언트는 캐시에서 100ms 업데이트',
        performance: 'WebSocket 트래픽 1000배 감소, 사용자 경험은 동일'
      },
      
      // 📊 실제 전송되는 F1 데이터 상세 정보
      f1DataDetails: {
        timingData: {
          description: "F1 정밀 타이밍 데이터",
          fields: {
            lapTimes: "현재/베스트/마지막 랩 타임 (밀리초 정밀도)",
            sectorTimes: "3구간별 타임과 세션 베스트 기록",
            positions: "실시간 순위와 포지션 변경"
          }
        },
        telemetryData: {
          description: "차량 텔레메트리 실시간 데이터", 
          fields: {
            speed: "속도 (km/h, 소수점 포함)",
            throttle: "스로틀 페달 압력 (0-100%)",
            brake: "브레이크 압력 (0-100%)",
            gear: "현재 기어 (0=중립, 1-8)",
            rpm: "엔진 회전수 (정밀 RPM)",
            drs: "DRS 상태 (0=불가/1=가능/2=활성)"
          }
        },
        positionData: {
          description: "트랙상 정확한 위치 데이터",
          fields: {
            coordinates: "X,Y,Z 3D 좌표계 (미터 단위)",
            angle: "차량 진행 방향 (도 단위)",
            trackPosition: "트랙 레이아웃 기준 정밀 위치"
          }
        },
        raceData: {
          description: "레이스 상황 정보",
          fields: {
            gaps: "앞차와의 거리 (미터 단위)",
            tires: "타이어 컴파운드와 나이 (랩 수)",
            status: "드라이버 상태 (Driving/Finished/Retired/DNF)",
            weather: "트랙 온도, 기온, 습도, 바람"
          }
        }
      }
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
