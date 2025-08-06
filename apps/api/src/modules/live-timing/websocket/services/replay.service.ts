import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LiveTimingGateway } from '../gateways/live-timing.gateway';
import { TimingUpdateMessage, DriverTimingData, SessionInfoMessage } from '../dto';

/**
 * 🏎️ ChronoF1 ReplayService - F1 라이브 타이밍 재생 핵심 서비스
 *
 * 주요 기능:
 * 1. F1 세션 데이터를 실시간으로 재생 (WebSocket 스트리밍)
 * 2. 시간 정규화: DB 절대시간(4260s~) → 사용자 친화적 시간(0s~)
 * 3. 고성능 캐싱: 청크 기반 + 실시간 데이터 캐시
 * 4. 안정적인 데이터 일관성: 빈 데이터 방지 + 폴백 시스템
 */

/**
 * DB에서 조회되는 단순화된 쿼리 결과 인터페이스
 * - 복잡한 JOIN 쿼리 결과를 TypeScript로 안전하게 매핑하기 위함
 */
interface SimplifiedQueryResult {
  driver_session_id: number;
  car_number: number;
  default_position?: number;
  driver_id: number;
  driver_number?: number;
  driver_code: string;
  driver_name: string;
  team_id: number;
  team_name: string;
  team_short_name?: string;
  team_color?: string;
  speed?: number;
  throttle?: number;
  gear?: number;
  rpm?: number;
  lap_number?: number;
  current_position?: number;
  current_lap_time?: number;
}

@Injectable()
export class ReplayService {
  private readonly logger = new Logger(ReplayService.name);

  // 청크 캐시 (5분 단위로 데이터 캐싱)
  private readonly chunkCache = new Map<
    string,
    {
      data: DriverTimingData[];
      startTime: number;
      endTime: number;
      lastUsed: number;
    }
  >();

  private readonly CHUNK_DURATION = 120; // 2분 (초) - 더 세밀한 캐싱
  private readonly MAX_CACHE_SIZE = 50; // 최대 50개 청크 (약 1.5시간분)
  private readonly PRELOAD_CHUNKS = 3; // 현재 청크 + 다음 3개 청크 미리 로드 (6분 버퍼)

  private readonly activeSessions = new Map<
    number,
    {
      sessionId: number;
      replayState: 'PLAYING' | 'PAUSED' | 'STOPPED';
      speed: number;
      currentTimestamp: number;
      startTime: number;
      intervalId?: NodeJS.Timeout;
      totalDuration?: number;
      subscribedClients: Set<string>;
      sessionInfo?: {
        minSessionTime: number; // 세션의 실제 최소 시간
        maxSessionTime: number; // 세션의 실제 최대 시간
        liveSessionId: number; // LiveSession ID
      };
      currentChunk?: number; // 현재 로드된 청크
      preloadingChunks: Set<number>; // 현재 미리 로딩 중인 청크들
      lastTimingData?: DriverTimingData[]; // 마지막으로 조회한 타이밍 데이터 캐시
      lastLap?: number; // 마지막으로 조회한 랩 정보 캐시
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => LiveTimingGateway))
    private readonly liveTimingGateway: LiveTimingGateway,
  ) {}

  /**
   * 🚀 F1 세션 재생 시작 - 핵심 진입점
   *
   * 프로세스:
   * 1. 기존 세션 확인 (이미 재생 중인 경우 클라이언트만 추가)
   * 2. DB에서 세션 기본 정보 조회 (CommonSession)
   * 3. 라이브 세션 정보 조회 (LiveSession)
   * 4. 🔑 시간 정규화: DB 절대시간(4260s~) → 사용자 친화적 시간(0s~)
   * 5. 활성 세션 등록 및 청크 캐시 미리 로딩
   * 6. 1초 간격 타이머 시작으로 실시간 스트리밍 개시
   */
  async startReplay(
    sessionId: number,
    clientId: string,
    startTimestamp = 0,
    speed = 1,
  ): Promise<void> {
    this.logger.log(
      `세션 ${sessionId} 재생 시작 요청: 클라이언트=${clientId}, 시간=${startTimestamp}초, 속도=${speed}x`,
    );

    const existingSession = this.activeSessions.get(sessionId);
    if (existingSession) {
      existingSession.subscribedClients.add(clientId);
      this.logger.log(
        `기존 세션 ${sessionId}에 클라이언트 ${clientId} 추가. 총 구독자: ${existingSession.subscribedClients.size}`,
      );

      if (existingSession.replayState === 'PAUSED') {
        existingSession.replayState = 'PLAYING';
        existingSession.speed = speed;
        existingSession.startTime = Date.now() - (existingSession.currentTimestamp * 1000) / speed;
        this.startReplayTimer(sessionId);
        this.logger.log(`세션 ${sessionId} 재생 재개.`);
      }
      return;
    }

    // 세션 정보 조회
    this.logger.log(`새로운 리플레이 세션 ${sessionId} 데이터 로딩 시작...`);
    const sessionInfo = await this.prisma.commonSession.findUnique({
      where: { id: sessionId },
    });
    if (!sessionInfo) {
      this.logger.error(`❌ 세션 ${sessionId} 정보를 찾을 수 없습니다.`);
      return;
    }
    this.logger.log(`✅ 세션 ${sessionId} 기본 정보 조회 완료: ${sessionInfo.name}`);

    // 라이브 세션 조회
    const liveSession = await this.prisma.liveSession.findFirst({
      where: { commonSessionId: sessionId },
    });
    if (!liveSession) {
      this.logger.error(`❌ 세션 ${sessionId}에 대한 라이브 세션을 찾을 수 없습니다.`);
      return;
    }
    this.logger.log(`✅ 라이브 세션 ${liveSession.id} 조회 완료`);

    // 실제 세션 시간 범위를 먼저 조회 (정확한 시간 범위 사용)
    this.logger.log(`세션 ${sessionId} 실제 시간 범위 조회 중...`);
    let minSessionTime = 0;
    let maxSessionTime = sessionInfo.duration || 7200;

    try {
      const timeRange = await this.prisma.$queryRaw<[{ min_time: number; max_time: number }]>`
        SELECT 
          MIN(session_time) as min_time,
          MAX(session_time) as max_time
        FROM live_telemetry_data 
        WHERE driver_session_id IN (SELECT id FROM live_driver_sessions WHERE session_id = ${liveSession.id})
        AND session_time IS NOT NULL
      `;

      if (timeRange[0]?.min_time !== null && timeRange[0]?.max_time !== null) {
        minSessionTime = timeRange[0].min_time;
        maxSessionTime = timeRange[0].max_time;
        this.logger.log(
          `✅ 세션 ${sessionId} 실제 시간 범위: ${minSessionTime}초 ~ ${maxSessionTime}초`,
        );
      } else {
        this.logger.warn(`⚠️ 세션 ${sessionId} 시간 범위 데이터 없음, 기본값 사용`);
      }
    } catch (error: unknown) {
      this.logger.warn(
        `세션 ${sessionId} 시간 범위 조회 실패, 기본값 사용:`,
        error instanceof Error ? error.message : String(error),
      );
    }

    const totalDuration = maxSessionTime - minSessionTime;

    this.logger.log(
      `세션 ${sessionId} 시간 범위: ${minSessionTime}초 ~ ${maxSessionTime}초, 총 길이: ${totalDuration}초`,
    );

    // startTimestamp가 기본값(0)이면 세션 시작을 0초로 정규화
    const actualStartTimestamp = startTimestamp === 0 ? 0 : Math.max(0, startTimestamp);

    const activeSession = {
      sessionId,
      replayState: 'PLAYING' as const,
      speed,
      currentTimestamp: actualStartTimestamp,
      startTime: Date.now() - actualStartTimestamp * 1000,
      totalDuration,
      subscribedClients: new Set([clientId]),
      sessionInfo: {
        minSessionTime,
        maxSessionTime,
        liveSessionId: liveSession.id,
      },
      currentChunk: undefined,
      preloadingChunks: new Set<number>(),
    };

    this.activeSessions.set(sessionId, activeSession);
    this.logger.log(
      `세션 ${sessionId} 초기화 완료. 시작 시간: ${actualStartTimestamp}초 (실제 DB 시간: ${minSessionTime}초부터)`,
    );

    // 첫 번째 청크 미리 로딩 (백그라운드) - 정규화된 시간 기준
    const firstChunkIndex = this.getChunkIndex(actualStartTimestamp);
    this.preloadChunk(sessionId, firstChunkIndex).catch((error: Error) => {
      this.logger.warn(`첫 번째 청크 ${firstChunkIndex} 미리 로딩 실패: ${error.message}`);
    });

    // 즉시 재생 시작 (데이터 로딩 완료를 기다리지 않음)
    this.startReplayTimer(sessionId);

    // 빈 데이터로라도 초기 브로드캐스트 실행
    const initialUpdate: TimingUpdateMessage = {
      type: 'TIMING_UPDATE',
      sessionId,
      sessionTime: actualStartTimestamp,
      currentLap: 1,
      sessionStatus: 'PLAYING',
      drivers: [],
    };

    try {
      this.liveTimingGateway.broadcastTimingUpdate(sessionId, initialUpdate);
      this.logger.log(`세션 ${sessionId} 초기 브로드캐스트 완료 (시간: ${actualStartTimestamp}초)`);
    } catch (error) {
      this.logger.error(`초기 브로드캐스트 실패 (세션 ${sessionId}):`, error);
    }
  }

  /**
   * ⏰ 재생 타이머 시작 - 1초마다 실행되는 핵심 루프
   *
   * 프로세스:
   * 1. 즉시 첫 브로드캐스트 실행 (UI 빠른 응답)
   * 2. setInterval로 1초마다 타이밍 업데이트
   * 3. 구독 클라이언트 수 확인 (0명이면 자동 일시정지)
   * 4. 현재 시간 계산: (현재시각 - 시작시각) × 재생속도
   * 5. 세션 종료 시간 체크 (무한 루프 방지)
   * 6. broadcastTimingUpdate 호출로 WebSocket 전송
   */
  /**
   * ⏰ 청크 데이터 전송 타이머 - 프론트엔드 캐시용 데이터 청크 제공
   *
   * 🚀 **올바른 F1 라이브 타이밍 아키텍처:**
   * 1. **백엔드**: 1-2분 청크 데이터를 주기적으로 전송 (WebSocket 부하 최소화)
   * 2. **프론트엔드**: 청크 데이터를 캐시하고 클라이언트에서 100ms 간격 UI 업데이트
   * 3. **청크 전송 주기**: 30초마다 다음 청크 전송 (버퍼링 확보)
   * 4. **프리로딩**: 현재 재생 위치 기준 다음 2-3개 청크 미리 준비
   * 5. 구독 클라이언트 수 확인 (0명이면 자동 일시정지)
   * 6. 현재 시간 계산: (현재시각 - 시작시각) × 재생속도
   * 7. 세션 종료 시간 체크 (무한 루프 방지)
   */
  private startReplayTimer(sessionId: number): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    if (sessionData.intervalId) clearInterval(sessionData.intervalId);

    // 첫 번째 청크 데이터 즉시 전송
    this.sendChunkData(sessionId).catch(error => {
      this.logger.error(
        `초기 청크 데이터 전송 실패 (세션 ${sessionId}):`,
        error instanceof Error ? error.message : String(error),
      );
    });

    sessionData.intervalId = setInterval(async () => {
      if (sessionData.replayState !== 'PLAYING') return;

      // 구독된 클라이언트가 없으면 재생 일시정지
      if (sessionData.subscribedClients.size === 0) {
        this.logger.log(`세션 ${sessionId}: 연결된 클라이언트가 없어서 재생을 일시정지합니다.`);
        this.pauseReplay(sessionId);
        return;
      }

      const elapsedSeconds = (Date.now() - sessionData.startTime) / 1000;
      sessionData.currentTimestamp = elapsedSeconds * sessionData.speed;

      // 세션 시간 범위 체크 (무한 루프 방지) - 정규화된 시간 기준
      const { maxSessionTime, minSessionTime } = sessionData.sessionInfo || {};
      if (maxSessionTime && minSessionTime) {
        const maxNormalizedTime = maxSessionTime - minSessionTime;
        if (sessionData.currentTimestamp >= maxNormalizedTime) {
          this.logger.log(
            `세션 ${sessionId} 종료 (${sessionData.currentTimestamp.toFixed(1)}s >= ${maxNormalizedTime.toFixed(1)}s). 리플레이 중지.`,
          );
          this.stopReplay(sessionId);
          return;
        }
      }

      // 청크 데이터 전송 (30초마다 실행)
      if (
        Math.floor(sessionData.currentTimestamp) % 30 === 0 &&
        Math.floor(sessionData.currentTimestamp * 10) % 300 === 0
      ) {
        this.logger.debug(
          `세션 ${sessionId} 청크 데이터 전송: ${sessionData.currentTimestamp.toFixed(1)}초`,
        );
        await this.sendChunkData(sessionId);
      }

      // 재생 위치 업데이트만 전송 (데이터는 청크로 전송됨)
      this.sendPlaybackPosition(sessionId);
    }, 1000); // 1초마다 체크 (실제 데이터 전송은 30초마다)

    this.logger.log(`세션 ${sessionId} 청크 전송 타이머 시작됨`);
  }

  /**
   * 📦 청크 데이터 전송 - 프론트엔드 캐시용 1-2분 단위 데이터 청크
   */
  private async sendChunkData(sessionId: number): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    try {
      const currentChunkIndex = this.getChunkIndex(sessionData.currentTimestamp);

      // 현재 청크와 다음 청크들 준비 (프리로딩)
      const chunksToSend = [currentChunkIndex, currentChunkIndex + 1, currentChunkIndex + 2];

      for (const chunkIndex of chunksToSend) {
        await this.sendSingleChunk(sessionId, chunkIndex);
      }

      this.logger.debug(`세션 ${sessionId} 청크 데이터 전송 완료: ${chunksToSend.join(', ')}`);
    } catch (error) {
      this.logger.error(
        `청크 데이터 전송 실패 (세션 ${sessionId}):`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * 📦 단일 청크 전송
   */
  private async sendSingleChunk(sessionId: number, chunkIndex: number): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData || !sessionData.sessionInfo) return;

    // 청크 시간 범위 계산 (정규화된 시간 기준)
    const normalizedStartTime = chunkIndex * this.CHUNK_DURATION;
    const normalizedEndTime = normalizedStartTime + this.CHUNK_DURATION;

    // DB 절대 시간으로 변환
    const { minSessionTime, maxSessionTime } = sessionData.sessionInfo;
    const maxNormalizedTime = maxSessionTime - minSessionTime;

    // 세션 범위를 벗어나면 전송하지 않음
    if (normalizedStartTime >= maxNormalizedTime) return;

    try {
      // 청크 내 모든 타이밍 데이터 수집 (10초 간격 샘플링)
      const chunkTimingData: { [timestamp: number]: DriverTimingData[] } = {};
      const sampleInterval = 10; // 10초 간격

      for (
        let normalizedTime = normalizedStartTime;
        normalizedTime < normalizedEndTime && normalizedTime < maxNormalizedTime;
        normalizedTime += sampleInterval
      ) {
        const dbTime = normalizedTime + minSessionTime;

        const timingData = await this.getSimplifiedTimingData(sessionId, dbTime);
        if (timingData.length > 0) {
          chunkTimingData[normalizedTime] = timingData;
        }
      }

      if (Object.keys(chunkTimingData).length === 0) return;

      // 청크 데이터 메시지 구성
      const chunkMessage = {
        type: 'CHUNK_DATA',
        sessionId,
        chunkIndex,
        startTime: normalizedStartTime,
        endTime: Math.min(normalizedEndTime, maxNormalizedTime),
        timingData: chunkTimingData,
        totalChunks: Math.ceil(maxNormalizedTime / this.CHUNK_DURATION),
      };

      // WebSocket으로 청크 전송
      this.liveTimingGateway.broadcastChunkData(sessionId, chunkMessage);

      this.logger.debug(
        `청크 ${chunkIndex} 전송 완료 (${Object.keys(chunkTimingData).length}개 타임스탬프)`,
      );
    } catch (error) {
      this.logger.warn(
        `청크 ${chunkIndex} 전송 실패:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * 📍 재생 위치 업데이트 전송 (데이터 없이 위치만)
   */
  private sendPlaybackPosition(sessionId: number): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    const positionUpdate = {
      type: 'PLAYBACK_POSITION',
      sessionId,
      currentTime: sessionData.currentTimestamp,
      sessionTimeFormatted: `${Math.floor(sessionData.currentTimestamp / 60)}:${(sessionData.currentTimestamp % 60).toFixed(3).padStart(6, '0')}`,
      sessionStatus: sessionData.replayState,
      speed: sessionData.speed,
    };

    try {
      // 재생 위치는 별도의 이벤트로 전송 (broadcastChunkData가 아닌 일반 이벤트)
      this.liveTimingGateway.broadcastPlaybackPosition(sessionId, positionUpdate);
    } catch (error) {
      this.logger.warn(
        `재생 위치 업데이트 전송 실패 (세션 ${sessionId}):`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  pauseReplay(sessionId: number): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData || sessionData.replayState !== 'PLAYING') return;

    sessionData.replayState = 'PAUSED';
    if (sessionData.intervalId) {
      clearInterval(sessionData.intervalId);
      sessionData.intervalId = undefined;
    }
    this.logger.log(
      `세션 ${sessionId} 일시정지: 시간=${sessionData.currentTimestamp.toFixed(1)}초`,
    );
    this.broadcastReplayStatus(sessionId, 'PAUSED');
  }

  stopReplay(sessionId: number): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    if (sessionData.intervalId) {
      clearInterval(sessionData.intervalId);
    }
    this.activeSessions.delete(sessionId);
    this.logger.log(`세션 ${sessionId} 정지 및 데이터 삭제.`);
    this.broadcastReplayStatus(sessionId, 'STOPPED');
  }

  async seekReplay(sessionId: number, seekTimestamp: number): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData || !sessionData.sessionInfo) return;

    // seekTimestamp를 정규화된 시간으로 처리 (0 기준)
    const { maxSessionTime, minSessionTime } = sessionData.sessionInfo;
    const maxNormalizedTime = maxSessionTime - minSessionTime;
    const validNormalizedTimestamp = Math.max(0, Math.min(seekTimestamp, maxNormalizedTime));

    sessionData.currentTimestamp = validNormalizedTimestamp;
    sessionData.startTime = Date.now() - (validNormalizedTimestamp * 1000) / sessionData.speed;

    this.logger.log(
      `🎯 세션 ${sessionId} Seek: ${seekTimestamp}초 → ${validNormalizedTimestamp.toFixed(1)}초 (정규화 범위: 0~${maxNormalizedTime.toFixed(1)}초)`,
    );

    // 재생 중이었다면 타이머 재시작
    if (sessionData.replayState === 'PLAYING' && sessionData.intervalId) {
      clearInterval(sessionData.intervalId);
      sessionData.intervalId = undefined;
      this.startReplayTimer(sessionId);
    }

    await this.broadcastTimingUpdate(sessionId);
  }

  changeReplaySpeed(sessionId: number, speed: number): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    const validSpeed = Math.max(0.1, Math.min(speed, 10));
    sessionData.speed = validSpeed;
    sessionData.startTime = Date.now() - (sessionData.currentTimestamp * 1000) / validSpeed;

    this.logger.log(`세션 ${sessionId} 재생 속도 변경: ${validSpeed}x`);
  }

  unsubscribeClient(sessionId: number, clientId: string): void {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    sessionData.subscribedClients.delete(clientId);
    this.logger.log(
      `클라이언트 ${clientId}가 세션 ${sessionId} 구독 취소. 남은 구독자: ${sessionData.subscribedClients.size}`,
    );

    if (sessionData.subscribedClients.size === 0) {
      this.logger.log(`세션 ${sessionId}의 모든 클라이언트 연결 해제됨. 재생 정지.`);
      this.stopReplay(sessionId);
    }
  }

  /**
   * 청크 키 생성
   */
  private getChunkKey(sessionId: number, chunkIndex: number): string {
    return `session_${sessionId}_chunk_${chunkIndex}`;
  }

  /**
   * 정규화된 시간(0부터 시작)을 DB의 절대 시간으로 변환
   */
  private normalizedTimeToDbTime(
    normalizedTime: number,
    sessionInfo: { minSessionTime: number },
  ): number {
    return normalizedTime + sessionInfo.minSessionTime;
  }
  private getChunkIndex(normalizedTimestamp: number): number {
    // normalizedTimestamp는 이미 0부터 시작하는 정규화된 시간
    return Math.max(0, Math.floor(normalizedTimestamp / this.CHUNK_DURATION));
  }

  /**
   * 청크 미리 로딩
   */
  private async preloadChunk(sessionId: number, chunkIndex: number): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData || sessionData.preloadingChunks.has(chunkIndex)) {
      return; // 이미 로딩 중이거나 세션이 없음
    }

    const chunkKey = this.getChunkKey(sessionId, chunkIndex);
    if (this.chunkCache.has(chunkKey)) {
      return; // 이미 캐시됨
    }

    sessionData.preloadingChunks.add(chunkIndex);

    try {
      // 정규화된 시간 기준으로 청크 시간 계산
      const normalizedStartTime = chunkIndex * this.CHUNK_DURATION;
      const normalizedEndTime = normalizedStartTime + this.CHUNK_DURATION;

      // DB 절대 시간으로 변환
      const { minSessionTime } = sessionData.sessionInfo || { minSessionTime: 0 };
      const dbStartTime = normalizedStartTime + minSessionTime;
      const dbEndTime = normalizedEndTime + minSessionTime;

      this.logger.debug(
        `청크 ${chunkIndex} 미리 로딩 시작 (정규화: ${normalizedStartTime}s-${normalizedEndTime}s, DB: ${dbStartTime}s-${dbEndTime}s)`,
      );

      // 청크 시간 범위의 모든 타이밍 데이터 로드
      const chunkData: DriverTimingData[] = [];
      const sampleInterval = 60; // 60초 간격으로 샘플링

      for (
        let normalizedTime = normalizedStartTime;
        normalizedTime < normalizedEndTime;
        normalizedTime += sampleInterval
      ) {
        try {
          const dbTime = normalizedTime + minSessionTime;

          // 타임아웃 추가
          const timingData = await Promise.race([
            this.getSimplifiedTimingData(sessionId, dbTime),
            new Promise<DriverTimingData[]>((_, reject) =>
              setTimeout(() => reject(new Error('Preload timeout')), 2000),
            ),
          ]);

          if (timingData.length > 0) {
            // 각 타이밍 데이터에 정규화된 타임스탬프 저장
            timingData.forEach(data => {
              (data as DriverTimingData & { normalizedTimestamp: number }).normalizedTimestamp =
                normalizedTime;
            });
            chunkData.push(...timingData);
          }
        } catch (error) {
          this.logger.debug(
            `정규화 시간 ${normalizedTime}초 데이터 로드 실패:`,
            error instanceof Error ? error.message : 'Unknown error',
          );
          // 개별 데이터 포인트 실패는 무시하고 계속 진행
        }
      }

      // 캐시에 저장
      this.chunkCache.set(chunkKey, {
        data: chunkData,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        lastUsed: Date.now(),
      });

      // 캐시 크기 관리
      this.cleanupCache();

      this.logger.debug(`청크 ${chunkIndex} 미리 로딩 완료 (데이터 포인트: ${chunkData.length}개)`);
    } catch (error) {
      this.logger.debug(
        `청크 ${chunkIndex} 미리 로딩 실패:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      sessionData.preloadingChunks.delete(chunkIndex);
    }
  }

  /**
   * 캐시 정리 (LRU 방식)
   */
  private cleanupCache(): void {
    if (this.chunkCache.size <= this.MAX_CACHE_SIZE) {
      return;
    }

    // 가장 오래된 캐시 항목 찾기
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, cache] of this.chunkCache.entries()) {
      if (cache.lastUsed < oldestTime) {
        oldestTime = cache.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.chunkCache.delete(oldestKey);
      this.logger.debug(`오래된 캐시 삭제: ${oldestKey}`);
    }
  }

  /**
   * 현재 재생 위치 기반으로 필요한 청크들 미리 로딩
   */
  private async preloadNearbyChunks(sessionId: number, currentTimestamp: number): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    const currentChunk = this.getChunkIndex(currentTimestamp);

    // 현재 청크가 변경되었을 때만 미리 로딩
    if (sessionData.currentChunk !== currentChunk) {
      sessionData.currentChunk = currentChunk;

      // 현재 청크 + 다음 청크들 미리 로딩 (백그라운드)
      for (let i = 0; i < this.PRELOAD_CHUNKS; i++) {
        const chunkToLoad = currentChunk + i + 1;
        this.preloadChunk(sessionId, chunkToLoad).catch((error: Error) => {
          this.logger.debug(`청크 ${chunkToLoad} 미리 로딩 실패: ${error.message}`);
        });
      }
    }
  }

  /**
   * 📡 타이밍 데이터 브로드캐스트 - 데이터 일관성의 핵심
   *
   * 고성능 & 안정성 전략:
   * 1. 🔄 3초마다만 DB 조회 (성능 최적화)
   * 2. 🗄️ lastTimingData 캐시로 중간 시간은 기존 데이터 재사용
   * 3. 🛡️ 빈 데이터 전송 차단 (UI 깜빡임 방지)
   * 4. 🔁 폴백 시스템: DB 실패 시에도 캐시된 데이터로 계속 전송
   * 5. ⚡ 백그라운드 청크 미리 로딩으로 끊김 없는 재생
   */
  private async broadcastTimingUpdate(sessionId: number): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) return;

    try {
      // 필요한 청크들 미리 로딩 (백그라운드)
      this.preloadNearbyChunks(sessionId, sessionData.currentTimestamp);

      // DB 쿼리 빈도를 줄이되, 데이터 일관성을 위해 마지막 데이터 유지
      const shouldFetchRealData = Math.floor(sessionData.currentTimestamp) % 3 === 0; // 5초 → 3초로 단축
      let driverTimingData: DriverTimingData[] = [];
      let currentLap = 1;

      // 🔑 데이터 일관성의 핵심: 마지막 조회 데이터 캐시
      // - 목적: 드라이버 0↔20명 진동 현상 완전 차단
      // - 전략: 새 데이터가 없어도 기존 데이터 유지로 안정적 UI 제공
      if (!sessionData.lastTimingData) {
        sessionData.lastTimingData = [];
        sessionData.lastLap = 1;
      }

      if (shouldFetchRealData) {
        try {
          // 🔍 실제 DB 조회 (3초마다 한 번씩)
          const newDriverData = await this.getTimingDataAtTimestamp(
            sessionId,
            sessionData.currentTimestamp,
          );

          // 🛡️ 데이터 검증 및 캐시 업데이트 로직
          // - 새 데이터가 있으면 → 캐시 업데이트 + 브로드캐스트
          // - 새 데이터가 없으면 → 기존 캐시 데이터 유지 (안정성 우선)
          if (newDriverData.length > 0) {
            driverTimingData = newDriverData;
            sessionData.lastTimingData = newDriverData; // 캐시 업데이트
            this.logger.debug(`세션 ${sessionId}: 새 데이터 조회 성공 (${newDriverData.length}개)`);
          } else {
            driverTimingData = sessionData.lastTimingData || []; // 기존 데이터 사용
            this.logger.debug(
              `세션 ${sessionId}: 새 데이터 없음, 기존 데이터 유지 (${driverTimingData.length}개)`,
            );
          }

          // 현재 랩 조회도 3초마다만
          const newLap = await this.calculateCurrentLap(sessionId, sessionData.currentTimestamp);
          if (newLap && newLap > 0) {
            currentLap = newLap;
            sessionData.lastLap = newLap;
          } else {
            currentLap = sessionData.lastLap || 1; // 기존 랩 정보 유지 (기본값 1)
          }
        } catch (error) {
          this.logger.warn(
            `타이밍 데이터 조회 실패 (세션 ${sessionId}):`,
            error instanceof Error ? error.message : String(error),
          );
          // DB 오류 시 기존 캐시된 데이터 사용
          driverTimingData = sessionData.lastTimingData || [];
          currentLap = sessionData.lastLap || 1;
        }
      } else {
        // 🗄️ DB 조회 생략 구간: 캐시된 데이터로 지속적 스트리밍
        // - 목적: DB 부하 감소 + 일관된 사용자 경험
        // - 전략: 3초 주기가 아닌 중간 시간에는 마지막 데이터 재사용
        driverTimingData = sessionData.lastTimingData || [];
        currentLap = sessionData.lastLap || 1;
      }

      const timingUpdate: TimingUpdateMessage = {
        type: 'TIMING_UPDATE',
        sessionId,
        sessionTime: sessionData.currentTimestamp,
        currentLap: currentLap,
        totalLaps: undefined,
        sessionStatus: sessionData.replayState,
        drivers: driverTimingData, // 항상 캐시된 데이터 또는 빈 배열이 아닌 데이터
      };

      // 🚫 안전한 브로드캐스트: 빈 데이터 전송 차단 시스템
      // - 목적: UI에서 "드라이버 0명" 깜빡임 현상 완전 방지
      // - 전략: 데이터가 있을 때만 전송, 예외는 세션 시작 첫 1초
      if (driverTimingData.length > 0 || sessionData.currentTimestamp <= 1.0) {
        // 첫 1초는 빈 데이터도 허용
        try {
          this.liveTimingGateway.broadcastTimingUpdate(sessionId, timingUpdate);
        } catch (broadcastError) {
          this.logger.error(`브로드캐스트 실패 (세션 ${sessionId}):`, broadcastError);
        }
      } else {
        this.logger.debug(
          `세션 ${sessionId}: 빈 데이터로 인한 브로드캐스트 스킵 (시간: ${sessionData.currentTimestamp.toFixed(1)}초)`,
        );
      }
    } catch (error) {
      this.logger.error(`타이밍 업데이트 조회 중 오류 (세션 ${sessionId}):`, error);
      // 🔁 최후의 폴백 시스템: 오류 발생해도 서비스 중단 방지
      // - 전략: 빈 데이터 대신 마지막 캐시된 데이터로 계속 전송
      // - 목적: 사용자는 일시적 데이터 지연만 경험, 서비스는 지속
      try {
        const fallbackUpdate: TimingUpdateMessage = {
          type: 'TIMING_UPDATE',
          sessionId,
          sessionTime: sessionData.currentTimestamp,
          sessionStatus: sessionData.replayState,
          drivers: sessionData.lastTimingData || [], // 캐시된 데이터 사용
        };
        this.liveTimingGateway.broadcastTimingUpdate(sessionId, fallbackUpdate);
      } catch (fallbackError) {
        this.logger.error(`폴백 브로드캐스트도 실패 (세션 ${sessionId}):`, fallbackError);
      }
    }
  }

  /**
   * 🎯 특정 시간의 타이밍 데이터 조회 - 2단계 캐시 전략
   *
   * 성능 최적화 전략:
   * 1. 1단계: 청크 캐시 조회 (5분 단위 미리 로딩된 데이터)
   * 2. 2단계: 직접 DB 조회 (캐시 미스인 경우만)
   * 3. 시간 정규화: 사용자 시간(0s~) ↔ DB 절대시간(4260s~) 변환
   * 4. 30초 오차 허용으로 가장 가까운 데이터 반환
   */
  private async getTimingDataAtTimestamp(
    sessionId: number,
    normalizedTimestamp: number,
  ): Promise<DriverTimingData[]> {
    try {
      const sessionData = this.activeSessions.get(sessionId);
      if (!sessionData?.sessionInfo) return [];

      // 1. 청크 캐시에서 먼저 조회
      const chunkIndex = this.getChunkIndex(normalizedTimestamp);
      const chunkKey = this.getChunkKey(sessionId, chunkIndex);
      const cachedChunk = this.chunkCache.get(chunkKey);

      if (cachedChunk) {
        // 🗄️ 청크 캐시 활용: 시간별 그룹화 후 가장 가까운 데이터 검색
        const nearestDataList: DriverTimingData[] = [];
        const targetTime = normalizedTimestamp;

        // 캐시된 데이터를 시간별로 그룹화 (성능 최적화)
        const timeGroups = new Map<number, DriverTimingData[]>();
        cachedChunk.data.forEach(data => {
          const dataNormalizedTime = (data as DriverTimingData & { normalizedTimestamp: number })
            .normalizedTimestamp;
          if (!timeGroups.has(dataNormalizedTime)) {
            timeGroups.set(dataNormalizedTime, []);
          }
          timeGroups.get(dataNormalizedTime)!.push(data);
        });

        // 🎯 목표 시간과 가장 가까운 데이터 포인트 찾기
        let closestTime = -1;
        let minTimeDiff = Infinity;

        for (const [time] of timeGroups) {
          const timeDiff = Math.abs(time - targetTime);
          if (timeDiff < minTimeDiff && timeDiff <= 30) {
            // 30초 오차 허용 (10초 → 30초 확대)
            minTimeDiff = timeDiff;
            closestTime = time;
          }
        }

        if (closestTime >= 0) {
          nearestDataList.push(...(timeGroups.get(closestTime) || []));
        }

        if (nearestDataList.length > 0) {
          // ✅ 캐시 히트: 사용 시간 업데이트 (LRU 알고리즘)
          cachedChunk.lastUsed = Date.now();
          this.logger.debug(
            `캐시에서 데이터 반환 (세션 ${sessionId}, 정규화 시간 ${normalizedTimestamp}, 드라이버 ${nearestDataList.length}개)`,
          );
          return nearestDataList; // 전체 드라이버 데이터 반환 (단일 데이터 아님)
        }
      }

      // 🔍 캐시 미스: 직접 DB 조회 (정규화된 시간을 DB 절대시간으로 변환)
      const dbTime = this.normalizedTimeToDbTime(normalizedTimestamp, sessionData.sessionInfo);
      return await this.getSimplifiedTimingData(sessionId, dbTime);
    } catch (error) {
      this.logger.error(
        `타이밍 데이터 조회 실패 (세션 ${sessionId}, 정규화 시간 ${normalizedTimestamp}):`,
        error,
      );
      return [];
    }
  }

  /**
   * 성능 최적화된 단순 타이밍 데이터 조회
   */
  private async getSimplifiedTimingData(
    sessionId: number,
    dbTime: number, // DB의 절대 시간을 직접 받음
  ): Promise<DriverTimingData[]> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData?.sessionInfo) return [];

    const { liveSessionId } = sessionData.sessionInfo;

    try {
      // 효율적인 단일 쿼리: JOIN을 사용하여 최신 데이터만 가져오기
      const simplifiedData = await this.prisma.$queryRaw<SimplifiedQueryResult[]>`
        WITH latest_telemetry AS (
          SELECT DISTINCT ON (driver_session_id)
            driver_session_id,
            speed, throttle, gear, rpm
          FROM live_telemetry_data
          WHERE driver_session_id IN (
            SELECT id FROM live_driver_sessions WHERE session_id = ${liveSessionId}
          )
          AND session_time <= ${dbTime}
          ORDER BY driver_session_id, session_time DESC
        ),
        latest_laps AS (
          SELECT DISTINCT ON (driver_session_id)
            driver_session_id,
            lap_number, position, lap_time
          FROM live_laps
          WHERE driver_session_id IN (
            SELECT id FROM live_driver_sessions WHERE session_id = ${liveSessionId}
          )
          AND session_time <= ${dbTime}
          ORDER BY driver_session_id, session_time DESC
        )
        SELECT 
          ds.id as driver_session_id,
          ds.car_number,
          ds.position as default_position,
          d.id as driver_id,
          d.number as driver_number,
          d.code as driver_code,
          d.full_name as driver_name,
          t.id as team_id,
          t.name as team_name,
          t.short_name as team_short_name,
          t.color as team_color,
          lt.speed,
          lt.throttle,
          lt.gear,
          lt.rpm,
          ll.lap_number,
          ll.position as current_position,
          ll.lap_time as current_lap_time
        FROM live_driver_sessions ds
        JOIN common_drivers d ON ds.driver_id = d.id
        JOIN common_teams t ON ds.team_id = t.id
        LEFT JOIN latest_telemetry lt ON ds.id = lt.driver_session_id
        LEFT JOIN latest_laps ll ON ds.id = ll.driver_session_id
        WHERE ds.session_id = ${liveSessionId}
        ORDER BY ds.car_number
      `;

      return this.mapSimplifiedQueryResultToDriverTiming(simplifiedData);
    } catch (error) {
      // 연결 풀 에러인 경우 빈 배열 반환하여 계속 진행
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2024') {
        this.logger.warn(`연결 풀 고갈로 인한 쿼리 스킵 (DB 시간: ${dbTime})`);
        return [];
      }

      this.logger.error('단순화된 타이밍 데이터 조회 실패:');
      this.logger.error(error);
      return [];
    }
  }

  private mapSimplifiedQueryResultToDriverTiming(
    simplifiedData: SimplifiedQueryResult[],
  ): DriverTimingData[] {
    return simplifiedData.map(data => {
      const speed = data.speed || 0;
      const throttle = data.throttle || 0;

      // 단순화된 상태 계산
      let status = 'On Track';
      if (!data.speed) {
        status = 'No Data';
      } else if (speed < 5) {
        status = 'Stopped';
      } else if (speed < 50 && throttle < 10) {
        status = 'In Pits';
      } else if (speed > 200) {
        status = 'Racing';
      }

      return {
        driverSessionId: data.driver_session_id,
        carNumber: data.car_number,
        position: data.current_position || data.default_position,
        lapNumber: data.lap_number || 1,
        currentLapTime: data.current_lap_time
          ? Math.round(data.current_lap_time * 1000)
          : undefined,
        bestLapTime: undefined, // 성능상 제외
        lastLapTime: undefined,
        sector1Time: undefined,
        sector2Time: undefined,
        sector3Time: undefined,
        speed: data.speed ? Math.round(data.speed) : undefined,
        throttle: data.throttle ? Math.round(data.throttle * 100) / 100 : undefined,
        brake: 0, // 성능상 제외
        gear: data.gear || undefined,
        rpm: data.rpm ? Math.round(data.rpm) : undefined,
        status,
        tireCompound: undefined,
        tireAge: undefined,
        drs: undefined,
        distanceToDriverAhead: undefined,
        positionData: undefined,
        driver: {
          id: data.driver_id,
          number: data.driver_number,
          code: data.driver_code,
          fullName: data.driver_name,
        },
        team: {
          id: data.team_id,
          name: data.team_name,
          shortName: data.team_short_name,
          color: data.team_color,
        },
      };
    });
  }

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

  private async calculateCurrentLap(
    sessionId: number,
    normalizedTimestamp: number,
  ): Promise<number | undefined> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData?.sessionInfo) return 1;

    const { liveSessionId } = sessionData.sessionInfo;
    // 정규화된 시간을 DB 절대 시간으로 변환
    const dbTime = this.normalizedTimeToDbTime(normalizedTimestamp, sessionData.sessionInfo);

    try {
      // 타임아웃 설정 및 간단한 쿼리로 변경
      const currentLap = await Promise.race([
        this.prisma.$queryRaw<{ lap_number: number }[]>`
          SELECT lap_number
          FROM live_laps 
          WHERE driver_session_id = (
            SELECT id FROM live_driver_sessions 
            WHERE session_id = ${liveSessionId} 
            LIMIT 1
          )
          AND session_time <= ${dbTime}
          ORDER BY session_time DESC
          LIMIT 1
        `,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 3000),
        ),
      ]);

      return currentLap[0] ? currentLap[0].lap_number : 1;
    } catch (error) {
      // 연결 풀 고갈이나 타임아웃 시 기본값 반환
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2024') {
        this.logger.debug(`현재 랩 조회 연결 풀 고갈, 기본값 반환`);
      } else {
        this.logger.debug(
          `현재 랩 조회 실패 (정규화 시간: ${normalizedTimestamp}):`,
          error instanceof Error ? error.message : String(error),
        );
      }
      return 1; // 기본값 반환
    }
  }

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

  async getSessionInfo(
    sessionId: number,
  ): Promise<Omit<SessionInfoMessage, 'type' | 'timestamp'> | null> {
    const session = await this.prisma.commonSession.findUnique({
      where: { id: sessionId },
      include: {
        event: {
          include: {
            circuit: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // 실제 세션 데이터에서 최대 시간 조회
    const liveSession = await this.prisma.liveSession.findFirst({
      where: { commonSessionId: sessionId },
    });

    let maxSessionTime = session.duration ?? 7200;

    if (liveSession) {
      const timeRange = await this.prisma.$queryRaw<[{ max_time: number }]>`
        SELECT MAX(GREATEST(
          COALESCE((SELECT MAX(session_time) FROM live_telemetry_data WHERE driver_session_id IN (SELECT id FROM live_driver_sessions WHERE session_id = ${liveSession.id})), 0),
          COALESCE((SELECT MAX(session_time) FROM live_position_data WHERE driver_session_id IN (SELECT id FROM live_driver_sessions WHERE session_id = ${liveSession.id})), 0),
          COALESCE((SELECT MAX(session_time) FROM live_laps WHERE driver_session_id IN (SELECT id FROM live_driver_sessions WHERE session_id = ${liveSession.id})), 0)
        )) as max_time
      `;

      if (timeRange[0]?.max_time) {
        maxSessionTime = timeRange[0].max_time;
      }
    }

    return {
      session: {
        id: session.id,
        name: session.name,
        type: session.type,
        date: session.date.toISOString(),
        duration: session.duration ?? undefined,
        status: session.status ?? undefined,
        maxSessionTime: maxSessionTime,
      },
      event: {
        id: session.event.id,
        name: session.event.name,
        round: session.event.round,
      },
      circuit: {
        id: session.event.circuit.id,
        name: session.event.circuit.name,
        shortName: session.event.circuit.shortName ?? undefined,
        length: session.event.circuit.length ?? undefined,
      },
    };
  }
}
