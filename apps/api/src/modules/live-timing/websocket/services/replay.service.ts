import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LiveTimingGateway } from '../gateways/live-timing.gateway';
import { TimingUpdateMessage, DriverTimingData } from '../dto';

/**
 * 실시간 타이밍 데이터 재생 서비스
 *
 * 저장된 히스토리 타이밍 데이터를 재생하여 WebSocket을 통해 클라이언트에게 전송합니다.
 * 재생 속도 조절, 타임라인 탐색, 일시정지 등의 기능을 제공합니다.
 */
@Injectable()
export class ReplayService {
  private readonly logger = new Logger(ReplayService.name);

  // 재생 중인 세션 정보를 추적
  private readonly activeSessions = new Map<
    number,
    {
      sessionId: number; // 세션 ID
      replayState: 'PLAYING' | 'PAUSED' | 'STOPPED'; // 재생 상태
      speed: number; // 재생 속도 배수 (1=1x, 2=2x, 5=5x 등)
      currentTimestamp: number; // 현재 타임스탬프 (세션 시작 이후 경과 초)
      startTime: number; // 재생 시작 시간 (밀리초, Date.now() 기준)
      intervalId?: NodeJS.Timeout; // 재생 타이머 ID
      totalDuration?: number; // 세션 총 지속 시간 (초)
      subscribedClients: Set<string>; // 구독 중인 클라이언트 ID 목록
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly liveTimingGateway: LiveTimingGateway,
  ) {}

  /**
   * 특정 세션 재생을 시작합니다.
   * @param sessionId 세션 ID
   * @param clientId 클라이언트 ID
   * @param startTimestamp 시작 타임스탬프 (세션 시작 이후 경과 초)
   * @param speed 재생 속도 배수 (1=1x, 2=2x, 5=5x 등)
   */
  async startReplay(
    sessionId: number,
    clientId: string,
    startTimestamp = 0,
    speed = 1,
  ): Promise<void> {
    this.logger.log(`세션 ${sessionId} 재생 시작: 시간=${startTimestamp}초, 속도=${speed}x`);

    // 이미 재생 중인 세션인 경우 상태 업데이트
    const existingSession = this.activeSessions.get(sessionId);
    if (existingSession) {
      // 클라이언트 구독 추가
      existingSession.subscribedClients.add(clientId);

      // 이미 재생 중이면 현재 상태 반환
      if (existingSession.replayState === 'PLAYING') {
        this.logger.log(`세션 ${sessionId}는 이미 재생 중입니다. 클라이언트 ${clientId} 추가됨.`);
        return;
      }

      // 일시 정지 상태인 경우 재생 재개
      if (existingSession.replayState === 'PAUSED') {
        existingSession.replayState = 'PLAYING';
        existingSession.speed = speed;
        existingSession.startTime = Date.now() - existingSession.currentTimestamp * 1000;
        this.startReplayTimer(sessionId);
        return;
      }
    }

    // 세션 정보 조회
    const sessionInfo = await this.prisma.commonSession.findUnique({
      where: { id: sessionId },
      include: {
        liveSessions: {
          include: {
            driverSessions: {
              include: {
                driver: true,
                team: true,
              },
            },
          },
        },
      },
    });

    if (!sessionInfo || !sessionInfo.liveSessions.length) {
      this.logger.error(`세션 ${sessionId}를 찾을 수 없거나 라이브 데이터가 없습니다.`);
      return;
    }

    // 세션 총 지속 시간 계산
    const totalDuration = sessionInfo.duration || 7200; // 기본값 2시간

    // 타이밍 데이터 초기화 및 재생 시작
    const activeSession = {
      sessionId,
      replayState: 'PLAYING' as const,
      speed,
      currentTimestamp: startTimestamp,
      startTime: Date.now() - startTimestamp * 1000,
      totalDuration,
      subscribedClients: new Set([clientId]),
    };

    this.activeSessions.set(sessionId, activeSession);
    this.startReplayTimer(sessionId);

    // 초기 상태 브로드캐스트
    await this.broadcastTimingUpdate(sessionId);
  }

  /**
   * 타이밍 재생 타이머를 시작합니다.
   * @param sessionId 세션 ID
   */
  private startReplayTimer(sessionId: number): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    // 이미 실행 중인 타이머가 있으면 정지
    if (sessionData.intervalId) {
      clearInterval(sessionData.intervalId);
    }

    // 100ms마다 업데이트 (재생 속도에 따라 타임스탬프 계산)
    sessionData.intervalId = setInterval(async () => {
      if (sessionData.replayState !== 'PLAYING') return;

      // 현재 타임스탬프 계산: 실제 경과 시간 * 재생 속도
      const elapsedSinceStart = (Date.now() - sessionData.startTime) / 1000;
      sessionData.currentTimestamp = elapsedSinceStart * sessionData.speed;

      // 세션 종료 체크
      if (sessionData.currentTimestamp >= sessionData.totalDuration!) {
        this.stopReplay(sessionId);
        return;
      }

      // 1초마다 타이밍 업데이트 브로드캐스트 (재생 속도에 상관없이)
      if (Math.floor(sessionData.currentTimestamp) % 1 === 0) {
        await this.broadcastTimingUpdate(sessionId);
      }
    }, 100);
  }

  /**
   * 특정 세션 재생을 일시 정지합니다.
   * @param sessionId 세션 ID
   */
  pauseReplay(sessionId: number): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    sessionData.replayState = 'PAUSED';

    if (sessionData.intervalId) {
      clearInterval(sessionData.intervalId);
      sessionData.intervalId = undefined;
    }

    this.logger.log(
      `세션 ${sessionId} 재생 일시 정지: 시간=${sessionData.currentTimestamp.toFixed(1)}초`,
    );

    // 일시 정지 상태 브로드캐스트
    this.broadcastReplayStatus(sessionId, 'PAUSED');
  }

  /**
   * 특정 세션 재생을 정지하고 초기화합니다.
   * @param sessionId 세션 ID
   */
  stopReplay(sessionId: number): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    sessionData.replayState = 'STOPPED';
    sessionData.currentTimestamp = 0;

    if (sessionData.intervalId) {
      clearInterval(sessionData.intervalId);
      sessionData.intervalId = undefined;
    }

    this.logger.log(`세션 ${sessionId} 재생 정지`);

    // 정지 상태 브로드캐스트
    this.broadcastReplayStatus(sessionId, 'STOPPED');

    // 재생 세션 데이터 정리
    this.activeSessions.delete(sessionId);
  }

  /**
   * 특정 세션의 특정 시점으로 이동합니다.
   * @param sessionId 세션 ID
   * @param timestamp 이동할 타임스탬프 (세션 시작 이후 경과 초)
   */
  seekReplay(sessionId: number, timestamp: number): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    // 유효한 타임스탬프 범위 체크
    const validTimestamp = Math.max(0, Math.min(timestamp, sessionData.totalDuration || 7200));

    sessionData.currentTimestamp = validTimestamp;
    sessionData.startTime = Date.now() - (validTimestamp * 1000) / sessionData.speed;

    this.logger.log(`세션 ${sessionId} 재생 위치 이동: ${validTimestamp.toFixed(1)}초`);

    // 현재 상태 브로드캐스트
    this.broadcastReplayStatus(sessionId, sessionData.replayState);
  }

  /**
   * 재생 속도를 변경합니다.
   * @param sessionId 세션 ID
   * @param speed 재생 속도 배수 (1=1x, 2=2x, 5=5x 등)
   */
  changeReplaySpeed(sessionId: number, speed: number): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    // 재생 속도 변경 시 현재 타임스탬프 기준으로 startTime 재조정
    const validSpeed = Math.max(0.1, Math.min(speed, 10)); // 0.1x ~ 10x 범위로 제한
    sessionData.speed = validSpeed;
    sessionData.startTime = Date.now() - (sessionData.currentTimestamp * 1000) / validSpeed;

    this.logger.log(`세션 ${sessionId} 재생 속도 변경: ${validSpeed}x`);

    // 재생 타이머 재시작
    if (sessionData.replayState === 'PLAYING') {
      this.startReplayTimer(sessionId);
    }

    // 속도 변경 상태 브로드캐스트
    this.broadcastReplayStatus(sessionId, sessionData.replayState);
  }

  /**
   * 클라이언트가 세션 구독을 취소합니다.
   * @param sessionId 세션 ID
   * @param clientId 클라이언트 ID
   */
  unsubscribeClient(sessionId: number, clientId: string): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    sessionData.subscribedClients.delete(clientId);

    this.logger.log(`클라이언트 ${clientId}가 세션 ${sessionId} 구독 취소함`);

    // 구독 클라이언트가 없으면 세션 재생 정지
    if (sessionData.subscribedClients.size === 0) {
      this.logger.log(`세션 ${sessionId}의 모든 클라이언트 연결 해제됨. 재생 정지.`);
      this.stopReplay(sessionId);
    }
  }

  /**
   * 현재 타임스탬프에 해당하는 타이밍 데이터를 조회하여 브로드캐스트합니다.
   * @param sessionId 세션 ID
   */
  private async broadcastTimingUpdate(sessionId: number): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    try {
      // 현재 타임스탬프 기준으로 타이밍 데이터 조회
      const driverTimingData = await this.getTimingDataAtTimestamp(
        sessionId,
        sessionData.currentTimestamp,
      );

      const timingUpdate: TimingUpdateMessage = {
        type: 'TIMING_UPDATE',
        sessionId,
        sessionTime: sessionData.currentTimestamp,
        currentLap: this.calculateCurrentLap(),
        totalLaps: await this.getTotalLaps(),
        sessionStatus: sessionData.replayState,
        drivers: driverTimingData,
      };

      // 세션 룸에 타이밍 업데이트 브로드캐스트
      this.liveTimingGateway.broadcastTimingUpdate(sessionId, timingUpdate);
    } catch (error) {
      this.logger.error(`타이밍 업데이트 브로드캐스트 중 오류 발생:`, error);
    }
  }

  /**
   * 특정 타임스탬프의 드라이버별 타이밍 데이터를 조회합니다.
   * @param sessionId 세션 ID
   * @param timestamp 타임스탬프 (세션 시작 이후 경과 초)
   * @returns 드라이버별 타이밍 데이터
   */
  private async getTimingDataAtTimestamp(
    sessionId: number,
    timestamp: number,
  ): Promise<DriverTimingData[]> {
    // 세션 및 드라이버 정보 조회
    const liveSession = await this.prisma.liveSession.findFirst({
      where: { commonSessionId: sessionId },
      include: {
        driverSessions: {
          include: {
            driver: true,
            team: true,
            laps: {
              where: {
                lapStartTime: { lte: new Date(timestamp * 1000) },
              },
              orderBy: {
                lapNumber: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!liveSession) {
      return [];
    }

    // 드라이버별 타이밍 데이터 생성
    return liveSession.driverSessions.map((ds: any) => {
      const lastLap = ds.laps[0];
      const lastTelemetry = ds.telemetry[0];
      const lastPosition = ds.positions[0];

      return {
        driverSessionId: ds.id,
        carNumber: ds.carNumber,
        position: ds.position ?? undefined,
        lapNumber: lastLap?.lapNumber,
        currentLapTime: lastLap?.lapTime,
        bestLapTime: lastLap?.bestLapTime,
        lastLapTime: lastLap?.lastLapTime,
        sector1Time: lastLap?.sector1Time,
        sector2Time: lastLap?.sector2Time,
        sector3Time: lastLap?.sector3Time,
        speed: lastTelemetry?.speed,
        throttle: lastTelemetry?.throttle,
        brake: lastTelemetry?.brake,
        gear: lastTelemetry?.gear,
        rpm: lastTelemetry?.rpm,
        status: ds.status ?? undefined,
        tireCompound: lastLap?.compound,
        tireAge: lastLap?.tiresAge,
        drs: lastTelemetry?.drs,
        positionData: lastPosition
          ? {
              x: lastPosition.x,
              y: lastPosition.y,
              z: lastPosition.z,
              angle: lastPosition.angle,
            }
          : undefined,
        driver: {
          id: ds.driver.id,
          number: ds.driver.number ?? undefined,
          code: ds.driver.code,
          fullName: ds.driver.fullName,
        },
        team: {
          id: ds.team.id,
          name: ds.team.name,
          shortName: ds.team.shortName ?? undefined,
          color: ds.team.color ?? undefined,
        },
      };
    });
  }

  /**
   * 재생 상태를 브로드캐스트합니다.
   * @param sessionId 세션 ID
   * @param status 재생 상태
   */
  private broadcastReplayStatus(sessionId: number, status: 'PLAYING' | 'PAUSED' | 'STOPPED'): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    const replayStatus: TimingUpdateMessage = {
      type: 'TIMING_UPDATE',
      sessionId,
      sessionTime: sessionData.currentTimestamp,
      sessionStatus: status,
      drivers: [],
    };

    this.liveTimingGateway.broadcastTimingUpdate(sessionId, replayStatus);
  }

  /**
   * 현재 타임스탬프에 해당하는 랩 번호를 계산합니다.
   * @param sessionId 세션 ID
   * @param timestamp 타임스탬프
   * @returns 현재 랩 번호
   */
  private calculateCurrentLap(): number | undefined {
    // TODO: 실제 데이터를 기반으로 현재 랩 번호 계산 로직 구현
    // 세션 타입(예선, 결승 등)에 따라 다른 로직 적용 필요
    return 1;
  }

  /**
   * 세션의 총 랩 수를 조회합니다.
   * @param sessionId 세션 ID
   * @returns 총 랩 수
   */
  private async getTotalLaps(): Promise<number | undefined> {
    // TODO: 실제 데이터를 기반으로 총 랩 수 조회 로직 구현
    return 78; // 임시 값
  }

  /**
   * 현재 재생 중인 모든 세션 정보를 반환합니다.
   * @returns 재생 중인 세션 정보
   */
  getActiveReplays(): Record<string, unknown>[] {
    return Array.from(this.activeSessions.entries()).map(([sessionId, data]) => ({
      sessionId,
      status: data.replayState,
      speed: data.speed,
      currentTimestamp: data.currentTimestamp,
      totalDuration: data.totalDuration,
      clientCount: data.subscribedClients.size,
    }));
  }
}
