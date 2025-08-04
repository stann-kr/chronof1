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
    sessionStartTime: number;  // 세션 실제 시작 시간 (ms)
    replayStartTime: number;   // 리플레이 시작 시간 (ms)
    currentTime: number;       // 현재 리플레이 시간 (ms)
    playbackRate: number;    // 재생 속도
    intervalId?: NodeJS.Timeout;
    dataCallback: (data: TimingUpdateMessage) => void;
    paused: boolean;
    maxSessionTime: number; // 세션의 최대 시간 (초)
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

      // 세션의 최대 시간 조회
      const maxTimeResult = await this.prisma.liveTelemetryData.aggregate({
        _max: { sessionTime: true },
        where: {
          driverSession: {
            sessionId: { equals: sessionId },
          },
        },
      });
      const maxSessionTime = maxTimeResult?._max?.sessionTime || 0;

      // 응답 형식에 맞게 데이터 변환
      return {
        session: {
          id: session.id,
          name: session.name,
          type: session.type,
          date: session.date.toISOString(),
          duration: session.duration ?? undefined,
          status: session.status ?? undefined,
          maxSessionTime,
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
      const session = await this.prisma.commonSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
      }

      // 세션의 최대 시간 조회
      const maxTimeResult = await this.prisma.liveTelemetryData.aggregate({
        _max: { sessionTime: true },
        where: {
          driverSession: {
            sessionId: { equals: sessionId },
          },
        },
      });
      const maxSessionTime = maxTimeResult?._max?.sessionTime || 0;

      // 재생 세션 초기화
      const replaySession = {
        sessionId,
        sessionStartTime: session.date.getTime(),
        replayStartTime: Date.now(),
        currentTime: 0,
        playbackRate,
        dataCallback,
        paused: false,
        maxSessionTime,
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
      session.replayStartTime = Date.now() - session.currentTime;
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
      session.currentTime = Date.now() - session.replayStartTime;
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
    session.replayStartTime = Date.now() - seekTimeMs;
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
      session.currentTime = Date.now() - session.replayStartTime;
      session.replayStartTime = Date.now() - session.currentTime;
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
  private async scheduleNextUpdate(clientId: string) {
    const session = this.activeSessions.get(clientId);
    
    if (!session || session.paused) {
      return;
    }
    
    const elapsedMs = (Date.now() - session.replayStartTime) * session.playbackRate;
    session.currentTime = elapsedMs;

    const sessionTimeSec = elapsedMs / 1000;

    if (sessionTimeSec > session.maxSessionTime) {
      this.logger.log(`세션 ${session.sessionId} 리플레이 종료`);
      this.stopReplay(clientId);
      const finalData = await this.getTimingDataForTimestamp(session.sessionId, session.maxSessionTime);
      finalData.sessionStatus = 'FINISHED';
      session.dataCallback(finalData);
      return;
    }
    
    try {
      await this.fetchAndSendTimingData(clientId, session.sessionId, sessionTimeSec);
      const updateInterval = 100 / session.playbackRate;
      session.intervalId = setTimeout(() => {
        this.scheduleNextUpdate(clientId);
      }, updateInterval);
    } catch (error) {
      this.logger.error(`타이밍 데이터 조회 중 오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 타이밍 데이터 조회 및 전송
   * 
   * @param clientId 클라이언트 ID
   * @param sessionId 세션 ID
   * @param timestamp 세션 시작부터의 경과 시간 (초)
   */
  private async fetchAndSendTimingData(clientId: string, sessionId: number, sessionTime: number): Promise<void> {
    const session = this.activeSessions.get(clientId);
    
    if (!session) {
      return;
    }
    
    try {
      const timingData = await this.getTimingDataForTimestamp(sessionId, sessionTime);
      
      // 콜백 함수를 통해 메시지 전송
      session.dataCallback(timingData);
      
      // 디버깅 로그 추가
      this.logger.debug(`세션 ${sessionId}, 시간 ${sessionTime}초: 드라이버 ${timingData.drivers.length}명 데이터 전송`);
      
    } catch (error) {
      this.logger.error(`타이밍 데이터 조회 중 오류: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getTimingDataForTimestamp(sessionId: number, sessionTime: number): Promise<TimingUpdateMessage> {
    // 세션 정보 조회
    const sessionInfo = await this.prisma.commonSession.findUnique({
      where: { id: sessionId },
    });

    if (!sessionInfo) {
      throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
    }

    // LiveSession 정보 조회
    const liveSession = await this.prisma.liveSession.findFirst({
      where: { commonSessionId: sessionId },
    });

    if (!liveSession) {
      this.logger.warn(`라이브 세션을 찾을 수 없습니다: sessionId = ${sessionId}`);
      return {
        type: 'TIMING_UPDATE',
        sessionId,
        sessionTime,
        sessionStatus: sessionInfo.status || 'UNKNOWN',
        drivers: [],
      };
    }

    // 드라이버 세션 정보 조회
    const driverSessions = await this.prisma.liveDriverSession.findMany({
      where: { sessionId: liveSession.id },
      include: { driver: true, team: true },
    });

    const driversData: DriverTimingData[] = await Promise.all(
      driverSessions.map(async (driverSession) => {
        const telemetry = await this.prisma.liveTelemetryData.findFirst({
          where: {
            driverSessionId: driverSession.id,
            sessionTime: { gte: sessionTime },
          },
          orderBy: { sessionTime: 'asc' },
        });

        const position = await this.prisma.livePositionData.findFirst({
          where: {
            driverSessionId: driverSession.id,
            sessionTime: { gte: sessionTime },
          },
          orderBy: { sessionTime: 'asc' },
        });

        const currentLap = await this.prisma.liveLap.findFirst({
          where: {
            driverSessionId: driverSession.id,
            sessionTime: { lte: sessionTime },
          },
          orderBy: { sessionTime: 'desc' },
        });

        // 동적 상태 결정 로직
        let dynamicStatus = 'On Track';
        if (currentLap?.pitInTime && !currentLap.pitOutTime) {
          dynamicStatus = 'In Pits';
        } else if (driverSession.status && !['Finished', '+1 Lap', '+2 Laps'].includes(driverSession.status)) {
          dynamicStatus = driverSession.status;
        }

        return {
          driverSessionId: driverSession.id,
          carNumber: driverSession.carNumber,
          position: driverSession.position ?? undefined,
          lapNumber: currentLap?.lapNumber ?? 1,
          currentLapTime: currentLap?.lapTime ? currentLap.lapTime * 1000 : undefined,
          bestLapTime: undefined,
          lastLapTime: undefined,
          sector1Time: currentLap?.sector1Time ? currentLap.sector1Time * 1000 : undefined,
          sector2Time: currentLap?.sector2Time ? currentLap.sector2Time * 1000 : undefined,
          sector3Time: currentLap?.sector3Time ? currentLap.sector3Time * 1000 : undefined,
          speed: telemetry?.speed ? Number(telemetry.speed) : undefined,
          throttle: telemetry?.throttle ? Number(telemetry.throttle) : undefined,
          brake: telemetry?.brake ? Number(telemetry.brake) : undefined,
          gear: telemetry?.gear ? Number(telemetry.gear) : undefined,
          rpm: telemetry?.rpm ? Number(telemetry.rpm) : undefined,
          drs: telemetry?.drs ? Number(telemetry.drs) : undefined,
          distanceToDriverAhead: telemetry?.distanceToDriverAhead ? Number(telemetry.distanceToDriverAhead) : undefined,
          positionData: position
            ? { x: Number(position.x), y: Number(position.y), z: position.z ? Number(position.z) : undefined }
            : undefined,
          status: dynamicStatus,
          tireCompound: currentLap?.tyreCompound ?? undefined,
          tireAge: currentLap?.tyreLife ?? undefined,
          driver: {
            id: driverSession.driver.id,
            number: driverSession.driver.number || undefined,
            code: driverSession.driver.code,
            fullName: driverSession.driver.fullName,
          },
          team: {
            id: driverSession.team.id,
            name: driverSession.team.name,
            shortName: driverSession.team.shortName || undefined,
            color: driverSession.team.color || undefined,
          },
        };
      }),
    );

    return {
      type: 'TIMING_UPDATE',
      sessionId,
      sessionTime,
      currentLap: driversData.length > 0 ? Math.max(...driversData.map((d) => d.lapNumber || 1)) : 1,
      totalLaps: undefined,
      sessionStatus: 'ACTIVE',
      drivers: driversData,
    };
  }
}
