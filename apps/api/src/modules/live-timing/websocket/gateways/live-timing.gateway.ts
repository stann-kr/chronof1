import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  ReplayControlMessage,
  TimingUpdateMessage,
  SessionInfoMessage,
  ErrorMessage,
  ConnectionStatusMessage,
} from '../dto';
import { ReplayService } from '../services/replay.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/live-timing',
  transports: ['websocket', 'polling'],
})
export class LiveTimingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LiveTimingGateway.name);

  @WebSocketServer()
  server!: Server;

  private readonly connectedClients = new Map<
    string,
    {
      socket: Socket;
      sessionId?: number;
      joinedAt: Date;
    }
  >();

  constructor(
    @Inject(forwardRef(() => ReplayService))
    private readonly replayService: ReplayService,
  ) {}

  handleConnection(client: Socket): void {
    const clientId = client.id;
    this.logger.log(`클라이언트 연결됨: ${clientId}`);
    this.connectedClients.set(clientId, { socket: client, joinedAt: new Date() });

    const connectionStatus: ConnectionStatusMessage = {
      type: 'CONNECTION_STATUS',
      status: 'CONNECTED',
      timestamp: new Date().toISOString(),
    };
    client.emit('message', connectionStatus);
  }

  handleDisconnect(client: Socket): void {
    const clientId = client.id;
    const clientInfo = this.connectedClients.get(clientId);
    if (clientInfo && clientInfo.sessionId) {
      this.replayService.unsubscribeClient(clientInfo.sessionId, clientId);
    }
    this.connectedClients.delete(clientId);
    this.logger.log(`클라이언트 연결 해제: ${clientId}`);
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @MessageBody() data: { sessionId: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { sessionId } = data;
    const clientId = client.id;
    this.logger.log(`클라이언트 ${clientId}가 세션 ${sessionId}에 참가 요청`);

    try {
      const clientInfo = this.connectedClients.get(clientId);
      if (!clientInfo) {
        this.logger.error(`클라이언트 ${clientId}의 연결 정보를 찾을 수 없습니다.`);
        this.handleError(client, '클라이언트 연결 정보가 없습니다.');
        return;
      }

      // 기존 세션에서 나가기
      if (clientInfo.sessionId) {
        this.replayService.unsubscribeClient(clientInfo.sessionId, clientId);
        client.leave(`session-${clientInfo.sessionId}`);
        this.logger.log(`클라이언트 ${clientId}가 기존 세션 ${clientInfo.sessionId}에서 나왔습니다.`);
      }

      // 새 세션 정보 업데이트
      this.connectedClients.set(clientId, { ...clientInfo, sessionId });
      
      // Socket.IO room 참가 (동기화 문제 해결)
      const roomName = `session-${sessionId}`;
      
      // 1. 기존 room에서 완전히 나가기
      const clientCurrentRooms = Array.from(client.rooms || []);
      for (const room of clientCurrentRooms) {
        if (room.startsWith('session-') && room !== roomName) {
          await client.leave(room);
          this.logger.debug(`클라이언트 ${clientId}가 기존 room ${room}에서 나왔습니다.`);
        }
      }
      
      // 2. 새 room에 참가
      try {
        await client.join(roomName);
        this.logger.log(`클라이언트 ${clientId}가 room ${roomName}에 참가했습니다.`);
      } catch (error) {
        this.logger.error(`❌ 클라이언트 ${clientId}의 room ${roomName} 참가 실패:`, error);
        this.handleError(client, `세션 ${sessionId} 참가에 실패했습니다.`);
        return;
      }
      
      // 3. 충분한 지연 후 room 상태 확인 (Socket.IO adapter 동기화 대기)
      await new Promise(resolve => setTimeout(resolve, 500)); // 100ms → 500ms 증가
      
      let roomClientsCount = 0;
      let verificationAttempts = 0;
      const maxAttempts = 3;
      let clientIsInRoom = false;
      
      // room 참가 검증을 여러 번 시도
      while (verificationAttempts < maxAttempts) {
        try {
          // Adapter를 통한 확인 (가장 안정적인 방법)
          if (this.server.sockets.adapter?.rooms) {
            const roomClients = this.server.sockets.adapter.rooms.get(roomName);
            roomClientsCount = roomClients?.size || 0;
            
            // Adapter에서 클라이언트가 확인되면 성공으로 간주
            if (roomClientsCount > 0) {
              // 추가 확인: 실제 해당 클라이언트가 포함되어 있는지 검증
              clientIsInRoom = roomClients?.has(clientId) || false;
              if (clientIsInRoom) {
                this.logger.log(`✅ 세션 ${sessionId} room 참가 성공! (시도 ${verificationAttempts + 1}/${maxAttempts}) Adapter 카운트: ${roomClientsCount}명, 클라이언트 포함: ${clientIsInRoom}`);
                break; // 성공하면 루프 종료
              }
            }
          }
          
          verificationAttempts++;
          if (verificationAttempts < maxAttempts) {
            this.logger.debug(`🔍 Room 검증 재시도 ${verificationAttempts}/${maxAttempts} (${roomName}) - Adapter: ${roomClientsCount}, 클라이언트 포함: ${clientIsInRoom}`);
            await new Promise(resolve => setTimeout(resolve, 200)); // 추가 대기
          }
        } catch (error) {
          this.logger.warn(`Room 상태 확인 실패 (시도 ${verificationAttempts + 1}):`, error instanceof Error ? error.message : String(error));
          verificationAttempts++;
          // 에러가 발생해도 다음 시도까지 약간 대기
          if (verificationAttempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      
      // 4. room 참가 결과에 따른 처리 (클라이언트 확인을 우선시)
      if (clientIsInRoom) {
        // 디버깅 정보
        const allRooms = Array.from(this.server.sockets.adapter.rooms.keys())
          .filter(room => room.startsWith('session-'));
        this.logger.debug(`🔍 현재 세션 rooms: ${allRooms.join(', ')}`);
        this.logger.debug(`🔍 ${roomName}의 Adapter 카운트: ${roomClientsCount}, 클라이언트 직접 확인: ${clientIsInRoom}`);
        
        // 참가 확인 메시지 전송
        const confirmMessage = {
          type: 'ROOM_JOIN_CONFIRMED',
          sessionId,
          clientId,
          roomClientsCount: clientIsInRoom ? 1 : roomClientsCount, // 클라이언트가 있으면 최소 1개
          timestamp: new Date().toISOString(),
        };
        client.emit('message', confirmMessage); // room 전체가 아닌 해당 클라이언트에게만
        this.logger.debug(`🧪 room 참가 확인 메시지 전송 완료`);
      } else {
        // 완전 실패 - 마지막 시도
        const finalClientRooms = Array.from(client.rooms || []);
        this.logger.error(`❌ Room 참가 완전 실패! ${roomName}에서 클라이언트를 찾을 수 없습니다.`);
        this.logger.debug(`🔍 클라이언트 ${clientId}가 참가한 rooms: ${finalClientRooms.join(', ')}`);
        
        // 마지막 시도: 강제로 다시 참가
        try {
          await client.join(roomName);
          this.logger.log(`🔄 Room ${roomName} 최종 재참가 시도 완료`);
        } catch (retryError) {
          this.logger.error(`🔄 Room 최종 재참가 실패:`, retryError);
        }
      }

      const sessionInfo = await this.replayService.getSessionInfo(sessionId);
      if (sessionInfo) {
        const infoMessage: SessionInfoMessage = {
          type: 'SESSION_INFO',
          ...sessionInfo,
          timestamp: new Date().toISOString(),
        };
        client.emit('message', infoMessage);
        this.logger.log(`세션 ${sessionId} 정보를 클라이언트 ${clientId}에게 전송했습니다.`);
      } else {
        this.handleError(client, `세션 정보 ${sessionId}를 찾을 수 없습니다.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`세션 참가 처리 중 오류: ${errorMessage}`);
      this.handleError(client, `세션 참가 중 오류: ${errorMessage}`);
    }
  }

  @SubscribeMessage('replay-control')
  handleReplayControl(
    @MessageBody() data: ReplayControlMessage,
    @ConnectedSocket() client: Socket,
  ): void {
    const clientId = client.id;
    const { sessionId, type } = data;
    this.logger.log(
      `클라이언트 ${clientId}가 세션 ${sessionId}에 대해 ${type} 요청`,
    );

    const clientInfo = this.connectedClients.get(clientId);
    if (!clientInfo || clientInfo.sessionId !== sessionId) {
      return this.handleError(client, '해당 세션에 참가하지 않았습니다.');
    }

    try {
      switch (type) {
        case 'START':
          this.replayService.startReplay(sessionId, clientId, 0, data.speed || 1);
          break;
        case 'PAUSE':
          this.replayService.pauseReplay(sessionId);
          break;
        case 'STOP':
          this.replayService.stopReplay(sessionId);
          break;
        case 'SEEK':
          if (data.timestamp !== undefined) {
            this.replayService.seekReplay(sessionId, data.timestamp);
          } else {
            this.handleError(client, '탐색 시간이 지정되지 않았습니다.');
          }
          break;
        default:
          this.handleError(client, `지원하지 않는 제어 명령: ${type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`재생 제어 처리 중 오류: ${errorMessage}`);
      this.handleError(client, `재생 제어 중 오류: ${errorMessage}`);
    }
  }

  // 개별 이벤트 핸들러들 (하위 호환성)
  @SubscribeMessage('start-replay')
  handleStartReplay(
    @MessageBody() data: { sessionId: number; startTimestamp?: number; speed?: number },
    @ConnectedSocket() client: Socket,
  ): void {
    this.handleReplayControl({
      sessionId: data.sessionId,
      type: 'START',
      speed: data.speed || 1,
      timestamp: data.startTimestamp
    }, client);
  }

  @SubscribeMessage('pause-replay')
  handlePauseReplay(
    @MessageBody() data: { sessionId: number },
    @ConnectedSocket() client: Socket,
  ): void {
    this.handleReplayControl({
      sessionId: data.sessionId,
      type: 'PAUSE'
    }, client);
  }

  @SubscribeMessage('stop-replay')
  handleStopReplay(
    @MessageBody() data: { sessionId: number },
    @ConnectedSocket() client: Socket,
  ): void {
    this.handleReplayControl({
      sessionId: data.sessionId,
      type: 'STOP'
    }, client);
  }

  @SubscribeMessage('seek-replay')
  handleSeekReplay(
    @MessageBody() data: { sessionId: number; timestamp: number },
    @ConnectedSocket() client: Socket,
  ): void {
    this.handleReplayControl({
      sessionId: data.sessionId,
      type: 'SEEK',
      timestamp: data.timestamp
    }, client);
  }

  @SubscribeMessage('change-speed')
  handleChangeSpeed(
    @MessageBody() data: { sessionId: number; speed: number },
    @ConnectedSocket() client: Socket,
  ): void {
    const clientId = client.id;
    const { sessionId, speed } = data;
    this.logger.log(`클라이언트 ${clientId}가 세션 ${sessionId}의 속도를 ${speed}x로 변경 요청`);

    const clientInfo = this.connectedClients.get(clientId);
    if (!clientInfo || clientInfo.sessionId !== sessionId) {
      return this.handleError(client, '해당 세션에 참가하지 않았습니다.');
    }

    try {
      this.replayService.changeReplaySpeed(sessionId, speed);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`속도 변경 처리 중 오류: ${errorMessage}`);
      this.handleError(client, `속도 변경 중 오류: ${errorMessage}`);
    }
  }

  // 로그 스로틀링을 위한 Map (세션별 마지막 로그 시간 저장)
  private lastNoClientLogTime = new Map<number, number>();

  broadcastTimingUpdate(sessionId: number, data: TimingUpdateMessage): void {
    // 서버가 초기화되지 않았으면 브로드캐스트 스킵
    if (!this.server || !this.server.sockets) {
      this.logger.warn(`WebSocket 서버가 초기화되지 않음. 브로드캐스트 스킵 (세션 ${sessionId})`);
      return;
    }

    // 🎯 핵심 개선: Socket.IO room/adapter 의존성 완전 제거
    // 세션을 구독하는 모든 클라이언트에게 직접 전송
    const sessionClients = Array.from(this.connectedClients.entries())
      .filter(([, clientInfo]) => clientInfo.sessionId === sessionId);
    
    if (sessionClients.length === 0) {
      const now = Date.now();
      const lastLogTime = this.lastNoClientLogTime.get(sessionId) || 0;
      
      // 로그 스로틀링 (3초마다 한 번씩)
      if (now - lastLogTime > 3000) {
        this.logger.debug(`세션 ${sessionId}: 구독 중인 클라이언트가 없습니다. 브로드캐스트 스킵.`);
        this.lastNoClientLogTime.set(sessionId, now);
      }
      return;
    }

    // 클라이언트가 있으면 로그 타이머 리셋
    this.lastNoClientLogTime.delete(sessionId);
    
    try {
      // 📤 개별 클라이언트에게 직접 전송 (Socket.IO room 우회)
      let successCount = 0;
      let failCount = 0;
      
      for (const [clientId, clientInfo] of sessionClients) {
        try {
          // 🚀 핵심: volatile 없이 안정적인 직접 전송
          clientInfo.socket.emit('timing-update', data);
          clientInfo.socket.emit('message', data);
          successCount++;
          
          // 처음 몇 초 동안은 개별 전송 확인 로그
          if (data.sessionTime <= 5.0) {
            this.logger.debug(`✅ 클라이언트 ${clientId}에게 직접 전송 완료`);
          }
        } catch (clientError) {
          failCount++;
          this.logger.warn(`❌ 클라이언트 ${clientId} 전송 실패:`, clientError instanceof Error ? clientError.message : String(clientError));
        }
      }
      
      // 📊 성공/실패 통계 로깅 (디버깅 시에만 상세 로그)
      if (data.sessionTime <= 1.0 || (data.sessionTime % 5 === 0)) { // 첫 1초와 5초마다
        this.logger.debug(`[세션 ${sessionId}] 직접 브로드캐스트 결과:
        - 대상 클라이언트: ${sessionClients.length}명
        - 전송 성공: ${successCount}명, 실패: ${failCount}명
        - 전송 데이터: 시간=${data.sessionTime?.toFixed(3)}초, 드라이버=${data.drivers?.length || 0}개`);
      }
      
    } catch (error) {
      this.logger.error(`❌ 브로드캐스트 전송 실패 (세션 ${sessionId}):`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 📦 청크 데이터 브로드캐스트 (새로운 F1 라이브 타이밍 아키텍처)
   * 
   * 🚀 **백엔드 → 프론트엔드 청크 전송:**
   * 1. 1-2분 단위 데이터 청크를 한 번에 전송
   * 2. 프론트엔드에서 캐시 후 100ms 간격 UI 업데이트
   * 3. WebSocket 부하 최소화 + 부드러운 사용자 경험
   */
  broadcastChunkData(sessionId: number, chunkData: {
    type: string;
    sessionId: number;
    chunkIndex: number;
    startTime: number;
    endTime: number;
    timingData: Record<number, unknown[]>;
    totalChunks: number;
  }): void {
    // 서버가 초기화되지 않았으면 브로드캐스트 스킵
    if (!this.server || !this.server.sockets) {
      this.logger.warn(`WebSocket 서버가 초기화되지 않음. 청크 데이터 전송 스킵 (세션 ${sessionId})`);
      return;
    }

    // 세션을 구독하는 모든 클라이언트에게 청크 데이터 전송
    const sessionClients = Array.from(this.connectedClients.entries())
      .filter(([, clientInfo]) => clientInfo.sessionId === sessionId);
    
    if (sessionClients.length === 0) {
      this.logger.debug(`세션 ${sessionId}의 구독 클라이언트가 없어서 청크 데이터 전송 스킵`);
      return;
    }
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const [clientId, clientInfo] of sessionClients) {
        try {
          // 청크 데이터 전송
          clientInfo.socket.emit('chunk-data', chunkData);
          successCount++;
        } catch (clientError) {
          failCount++;
          this.logger.warn(`❌ 클라이언트 ${clientId} 청크 데이터 전송 실패:`, clientError instanceof Error ? clientError.message : String(clientError));
        }
      }
      
      this.logger.debug(`[세션 ${sessionId}] 청크 ${chunkData.chunkIndex} 전송 완료:
      - 대상 클라이언트: ${sessionClients.length}명
      - 전송 성공: ${successCount}명, 실패: ${failCount}명
      - 청크 범위: ${chunkData.startTime}s ~ ${chunkData.endTime}s`);
      
    } catch (error) {
      this.logger.error(`❌ 청크 데이터 브로드캐스트 실패 (세션 ${sessionId}):`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 📍 재생 위치 브로드캐스트 (현재 재생 시간만)
   */
  broadcastPlaybackPosition(sessionId: number, positionData: {
    type: string;
    sessionId: number;
    currentTime: number;
    sessionTimeFormatted: string;
    sessionStatus: string;
    speed: number;
  }): void {
    // 서버가 초기화되지 않았으면 브로드캐스트 스킵
    if (!this.server || !this.server.sockets) {
      this.logger.warn(`WebSocket 서버가 초기화되지 않음. 재생 위치 전송 스킵 (세션 ${sessionId})`);
      return;
    }

    // 세션을 구독하는 모든 클라이언트에게 재생 위치 전송
    const sessionClients = Array.from(this.connectedClients.entries())
      .filter(([, clientInfo]) => clientInfo.sessionId === sessionId);
    
    if (sessionClients.length === 0) {
      return; // 로그 없이 조용히 스킵
    }
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const [clientId, clientInfo] of sessionClients) {
        try {
          // 재생 위치 전송
          clientInfo.socket.emit('playback-position', positionData);
          successCount++;
        } catch (clientError) {
          failCount++;
          this.logger.warn(`❌ 클라이언트 ${clientId} 재생 위치 전송 실패:`, clientError instanceof Error ? clientError.message : String(clientError));
        }
      }
      
      // 디버그 로그는 10초마다만
      if (Math.floor(positionData.currentTime) % 10 === 0 && Math.floor(positionData.currentTime * 10) % 100 === 0) {
        this.logger.debug(`[세션 ${sessionId}] 재생 위치 전송: ${positionData.currentTime.toFixed(1)}초 (성공: ${successCount}, 실패: ${failCount})`);
      }
      
    } catch (error) {
      this.logger.error(`❌ 재생 위치 브로드캐스트 실패 (세션 ${sessionId}):`, error instanceof Error ? error.message : String(error));
    }
  }

  private handleError(client: Socket, message: string): void {
    this.logger.error(message);
    const errorMessage: ErrorMessage = {
      type: 'ERROR',
      code: 'REPLAY_ERROR',
      message,
      timestamp: new Date().toISOString(),
    };
    client.emit('message', errorMessage);
  }
}
