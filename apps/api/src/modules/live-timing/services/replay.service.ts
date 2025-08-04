import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TimingUpdateMessage, DriverTimingData } from '../websocket/dto/websocket-message.dto';

/**
 * 타이밍 데이터 재생 서비스
 * 
 * 이 서비스는 과거 F1 세션의 타이밍 데이터를 재생하는 기능을 제공합니다.
 * - 특정 세션의 타이밍 데이터를 로드하고 시간에 따라 재생
 * - 재생 속도 제어 (1x, 2x, 5x 등)
 * - 특정 시간대로 탐색
 * - 실시간 이벤트 발행 (WebSocket을 통해 클라이언트에 전송)
 */
@Injectable()
export class ReplayService {
  private readonly logger = new Logger(ReplayService.name);
  
  // 현재 재생 중인 세션들을 관리
  private readonly activeSessions = new Map<string, {
    sessionId: number;
    startTime: number;       // 재생 시작 시간 (ms)
    currentTime: number;     // 현재 재생 시간 (ms)
    playbackRate: number;    // 재생 속도 (1 = 정상, 2 = 2배속, 0.5 = 절반 속도)
    intervalId?: NodeJS.Timeout; // 타이머 ID
    dataCallback: (data: TimingUpdateMessage) => void; // 데이터 콜백 함수
    paused: boolean;         // 일시정지 상태
  }>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 세션 정보 조회
   * 
   * @param sessionId 세션 ID
   * @returns 세션 정보
   */
  async getSessionInfo(sessionId: number) {
    try {
      // 세션 정보 조회 (CommonSession)
      const session = await this.prisma.commonSession.findUnique({
        where: { id: sessionId },
        include: {
          event: {
            include: {
              circuit: true
            }
          }
        }
      });

      if (!session) {
        throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
      }

      // 응답 형식에 맞게 데이터 변환
      return {
        session: {
          id: session.id,
          name: session.name,
          type: session.type,
          date: session.date.toISOString(),
          duration: session.duration ?? undefined,
          status: session.status ?? undefined
        },
        event: {
          id: session.event.id,
          name: session.event.name,
          round: session.event.round
        },
        circuit: {
          id: session.event.circuit.id,
          name: session.event.circuit.name,
          shortName: session.event.circuit.shortName ?? undefined,
          length: session.event.circuit.length ?? undefined
        }
      };
    } catch (error) {
      this.logger.error(`세션 정보 조회 중 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 재생 시작
   * 
   * @param clientId 클라이언트 ID
   * @param sessionId 세션 ID
   * @param dataCallback 데이터 콜백 함수
   * @param playbackRate 재생 속도 (기본값: 1)
   */
  async startReplay(
    clientId: string, 
    sessionId: number, 
    dataCallback: (data: TimingUpdateMessage) => void,
    playbackRate = 1
  ) {
    // 이미 실행 중인 세션이 있으면 중지
    if (this.activeSessions.has(clientId)) {
      this.stopReplay(clientId);
    }

    try {
      // 세션 유효성 검사
      const sessionExists = await this.prisma.commonSession.findUnique({
        where: { id: sessionId }
      });

      if (!sessionExists) {
        throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
      }

      // 재생 세션 초기화
      const replaySession = {
        sessionId,
        startTime: Date.now(),
        currentTime: 0, // 세션 시작부터 재생
        playbackRate,
        dataCallback,
        paused: false
      };

      // 세션 저장
      this.activeSessions.set(clientId, replaySession);
      
      // 재생 시작
      this.scheduleNextUpdate(clientId);
      
      this.logger.log(`클라이언트 ${clientId}의 세션 ${sessionId} 재생 시작 (속도: ${playbackRate}x)`);
    } catch (error) {
      this.logger.error(`재생 시작 중 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 재생 일시정지
   * 
   * @param clientId 클라이언트 ID
   */
  pauseReplay(clientId: string) {
    const session = this.activeSessions.get(clientId);
    
    if (!session) {
      throw new Error('재생 중인 세션이 없습니다.');
    }
    
    // 이미 일시정지 상태인 경우 재개
    if (session.paused) {
      session.startTime = Date.now() - session.currentTime;
      session.paused = false;
      this.scheduleNextUpdate(clientId);
      this.logger.log(`클라이언트 ${clientId}의 재생 재개 (시간: ${session.currentTime / 1000}s)`);
    } else {
      // 타이머 제거
      if (session.intervalId) {
        clearTimeout(session.intervalId);
        session.intervalId = undefined;
      }
      
      // 현재 시간 저장
      session.currentTime = Date.now() - session.startTime;
      session.paused = true;
      this.logger.log(`클라이언트 ${clientId}의 재생 일시정지 (시간: ${session.currentTime / 1000}s)`);
    }
  }

  /**
   * 재생 중지
   * 
   * @param clientId 클라이언트 ID
   */
  stopReplay(clientId: string) {
    const session = this.activeSessions.get(clientId);
    
    if (!session) {
      return; // 이미 중지되었거나 존재하지 않음
    }
    
    // 타이머 제거
    if (session.intervalId) {
      clearTimeout(session.intervalId);
    }
    
    // 세션 제거
    this.activeSessions.delete(clientId);
    this.logger.log(`클라이언트 ${clientId}의 재생 중지`);
  }

  /**
   * 특정 시간으로 이동
   * 
   * @param clientId 클라이언트 ID
   * @param timestamp 이동할 시간 (세션 시작 후 경과 초)
   */
  seekReplay(clientId: string, timestamp: number) {
    const session = this.activeSessions.get(clientId);
    
    if (!session) {
      throw new Error('재생 중인 세션이 없습니다.');
    }
    
    // 타이머 제거
    if (session.intervalId) {
      clearTimeout(session.intervalId);
      session.intervalId = undefined;
    }
    
    // 시간 업데이트 (ms로 변환)
    const seekTimeMs = timestamp * 1000;
    session.startTime = Date.now() - seekTimeMs;
    session.currentTime = seekTimeMs;
    
    this.logger.log(`클라이언트 ${clientId}의 재생 시간 이동: ${timestamp}초`);
    
    // 재생 중이었다면 다음 업데이트 예약
    if (!session.paused) {
      this.scheduleNextUpdate(clientId);
    }
  }

  /**
   * 재생 속도 설정
   * 
   * @param clientId 클라이언트 ID
   * @param playbackRate 재생 속도
   */
  setPlaybackRate(clientId: string, playbackRate: number) {
    const session = this.activeSessions.get(clientId);
    
    if (!session) {
      throw new Error('재생 중인 세션이 없습니다.');
    }
    
    // 유효성 검사
    if (playbackRate <= 0) {
      throw new Error('재생 속도는 0보다 커야 합니다.');
    }
    
    // 현재 시간 업데이트
    if (!session.paused) {
      session.currentTime = Date.now() - session.startTime;
      session.startTime = Date.now() - session.currentTime;
    }
    
    // 속도 업데이트
    session.playbackRate = playbackRate;
    
    this.logger.log(`클라이언트 ${clientId}의 재생 속도 변경: ${playbackRate}x`);
    
    // 재생 중이었다면 다음 업데이트 예약
    if (!session.paused && session.intervalId) {
      clearTimeout(session.intervalId);
      this.scheduleNextUpdate(clientId);
    }
  }

  /**
   * 다음 업데이트 예약
   * 
   * @param clientId 클라이언트 ID
   */
  private scheduleNextUpdate(clientId: string) {
    const session = this.activeSessions.get(clientId);
    
    if (!session || session.paused) {
      return;
    }
    
    // 현재 시간 계산
    const elapsedMs = Date.now() - session.startTime;
    session.currentTime = elapsedMs;
    
    // 타이밍 데이터 조회 및 전송
    this.fetchAndSendTimingData(clientId, session.sessionId, elapsedMs / 1000)
      .then(() => {
        // 다음 업데이트 예약 (100ms 간격, 재생 속도 적용)
        const updateInterval = 100 / session.playbackRate;
        session.intervalId = setTimeout(() => {
          this.scheduleNextUpdate(clientId);
        }, updateInterval);
      })
      .catch(error => {
        this.logger.error(`타이밍 데이터 조회 중 오류: ${error instanceof Error ? error.message : String(error)}`);
      });
  }

  /**
   * 타이밍 데이터 조회 및 전송
   * 
   * @param clientId 클라이언트 ID
   * @param sessionId 세션 ID
   * @param timestamp 시간 (초)
   */
  private async fetchAndSendTimingData(clientId: string, sessionId: number, timestamp: number): Promise<void> {
    const session = this.activeSessions.get(clientId);
    
    if (!session) {
      return;
    }
    
    try {
      // 세션 정보 조회
      const sessionInfo = await this.prisma.commonSession.findUnique({
        where: { id: sessionId }
      });
      
      if (!sessionInfo) {
        throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
      }

      // LiveSession 정보 조회 
      const liveSession = await this.prisma.liveSession.findFirst({
        where: { commonSessionId: sessionId }
      });
      
      if (!liveSession) {
        throw new Error(`라이브 세션을 찾을 수 없습니다: sessionId = ${sessionId}`);
      }
      
      // 드라이버 세션 정보 조회
      const driverSessions = await this.prisma.liveDriverSession.findMany({
        where: { sessionId: liveSession.id },
        include: {
          driver: true,
          team: true
        }
      });

      // 타이밍 데이터 준비 (LiveTelemetryData, LivePositionData 조회)
      const driversData: DriverTimingData[] = [];
      
      // 각 드라이버별로 데이터 조회 및 가공
      for (const driverSession of driverSessions) {
        // 해당 시간대의 텔레메트리 데이터 조회
        const telemetry = await this.prisma.liveTelemetryData.findFirst({
          where: {
            driverSessionId: driverSession.id,
            sessionTime: {
              // 타임스탬프는 초 단위로 저장되므로, 현재 시간 ±0.5초 범위 내의 데이터 조회
              gte: timestamp - 0.5,
              lte: timestamp + 0.5
            }
          },
          orderBy: {
            sessionTime: 'asc'
          }
        });
        
        // 해당 시간대의 위치 데이터 조회
        const position = await this.prisma.livePositionData.findFirst({
          where: {
            driverSessionId: driverSession.id,
            // 타임스탬프로 검색 (Prisma에서는 timestamp가 DateTime 타입이므로 적절히 변환 필요)
            timestamp: {
              // 여기서는 근사치로 조회 (실제 구현시 세션 시작 시간 기준으로 계산 필요)
              gte: new Date(Date.now() - 1000), // 현재 시간 기준 1초 전
              lte: new Date() // 현재 시간
            }
          },
          orderBy: {
            timestamp: 'desc'
          }
        });
        
        // 현재 랩 정보 조회
        const currentLap = await this.prisma.liveLap.findFirst({
          where: {
            driverSessionId: driverSession.id,
            // lapNumber 기준으로 가장 최근 랩 조회
          },
          orderBy: {
            lapNumber: 'desc'
          }
        });
        
        // 드라이버 타이밍 데이터 구성
        const driverTimingData: DriverTimingData = {
          driverSessionId: driverSession.id,
          carNumber: driverSession.carNumber,
          position: driverSession.position ?? undefined,
          lapNumber: currentLap?.lapNumber ?? undefined,
          currentLapTime: currentLap?.lapTime ? currentLap.lapTime * 1000 : undefined, // 초 -> 밀리초 변환
          bestLapTime: undefined, // 최고 랩 타임 데이터 필요
          lastLapTime: undefined, // 이전 랩 타임 데이터 필요
          sector1Time: currentLap?.sector1Time ? currentLap.sector1Time * 1000 : undefined,
          sector2Time: currentLap?.sector2Time ? currentLap.sector2Time * 1000 : undefined,
          sector3Time: currentLap?.sector3Time ? currentLap.sector3Time * 1000 : undefined,
          
          // 텔레메트리 데이터
          speed: telemetry?.speed ?? undefined,
          throttle: telemetry?.throttle ?? undefined,
          brake: telemetry?.brake ? 100 : 0, // 불리언 -> 숫자 변환
          gear: telemetry?.gear ?? undefined,
          rpm: telemetry?.rpm ?? undefined,
          drs: telemetry?.drs ?? undefined,
          
          // 위치 데이터
          positionData: position ? {
            x: position.x,
            y: position.y,
            z: position.z ?? undefined,
            angle: undefined // 현재 스키마에 angle 필드 없음
          } : undefined,
          
          // 상태 정보
          status: driverSession.status ?? 'UNKNOWN',
          tireCompound: currentLap?.tyreCompound ?? undefined,
          tireAge: currentLap?.tyreLife ?? undefined,
          
          // 드라이버 정보
          driver: {
            id: driverSession.driver.id,
            number: driverSession.driver.number || undefined,
            code: driverSession.driver.code,
            fullName: `${driverSession.driver.fullName}`
          },
          
          // 팀 정보
          team: {
            id: driverSession.team.id,
            name: driverSession.team.name,
            shortName: driverSession.team.shortName || undefined,
            color: driverSession.team.color || undefined
          }
        };
        
        driversData.push(driverTimingData);
      }
      
      // 클라이언트에 전송할 메시지 구성
      const message: TimingUpdateMessage = {
        type: 'TIMING_UPDATE',
        sessionId,
        timestamp,
        realTime: new Date().toISOString(),
        currentLap: driversData.length > 0 
          ? Math.max(...driversData.map(d => d.lapNumber || 0)) 
          : undefined,
        totalLaps: undefined, // 총 랩 수 데이터 필요
        sessionStatus: sessionInfo.status || 'UNKNOWN',
        drivers: driversData
      };
      
      // 콜백 함수를 통해 메시지 전송
      session.dataCallback(message);
      
    } catch (error) {
      this.logger.error(`타이밍 데이터 조회 중 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
