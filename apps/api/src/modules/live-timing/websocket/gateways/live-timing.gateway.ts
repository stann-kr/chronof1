import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { 
  ReplayControlMessage, 
  TimingUpdateMessage, 
  SessionInfoMessage, 
  ErrorMessage, 
  ConnectionStatusMessage 
} from '../dto/websocket-message.dto';
import { ReplayService } from '../../services/replay.service';

/**
 * 라이브 타이밍 WebSocket Gateway
 * 
 * 이 클래스는 클라이언트와 서버 간의 실시간 통신을 담당합니다.
 * Socket.IO를 사용하여 F1 라이브 타이밍 데이터를 실시간으로 스트리밍합니다.
 * 
 * 주요 기능:
 * - 클라이언트 연결/해제 관리
 * - 세션별 룸 관리 (각 F1 세션당 별도 룸)
 * - 재생 제어 (시작/일시정지/정지/탐색)
 * - 실시간 타이밍 데이터 브로드캐스팅
 */
@WebSocketGateway({
  // CORS 설정 - 모든 오리진에서 접근 가능하도록 (개발환경)
  cors: {
    origin: "*", // 모든 오리진 허용
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Socket.IO 네임스페이스 - /live-timing 경로로 접근
  namespace: '/live-timing',
  // Socket.IO 추가 설정
  transports: ['websocket', 'polling'],
})
export class LiveTimingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LiveTimingGateway.name);

  @WebSocketServer()
  server!: Server;

  // 연결된 클라이언트 정보를 추적
  private readonly connectedClients = new Map<string, {
    socket: Socket;
    sessionId?: number;
    joinedAt: Date;
  }>();

  constructor(private readonly replayService: ReplayService) {}

  /**
   * 클라이언트 연결 시 호출되는 핸들러
   * 
   * @param client 연결된 소켓 클라이언트
   */
  handleConnection(client: Socket): void {
    const clientId = client.id;
    this.logger.log(`클라이언트 연결됨: ${clientId}`);
    
    // 클라이언트 정보 저장
    this.connectedClients.set(clientId, {
      socket: client,
      joinedAt: new Date(),
    });

    // 연결 성공 메시지 전송
    const connectionStatus: ConnectionStatusMessage = {
      type: 'CONNECTION_STATUS',
      status: 'CONNECTED',
      timestamp: new Date().toISOString(),
    };
    
    client.emit('message', connectionStatus);
  }

  /**
   * 클라이언트 연결 해제 시 호출되는 핸들러
   * 
   * @param client 연결 해제된 소켓 클라이언트
   */
  handleDisconnect(client: Socket): void {
    const clientId = client.id;
    this.logger.log(`클라이언트 연결 해제: ${clientId}`);
    
    // 클라이언트가 재생 중인 세션이 있다면 정리
    const clientInfo = this.connectedClients.get(clientId);
    if (clientInfo && clientInfo.sessionId) {
      this.replayService.stopReplay(clientId);
    }
    
    // 클라이언트 정보 삭제
    this.connectedClients.delete(clientId);
  }

  /**
   * 세션 참가 메시지 구독
   * 
   * 클라이언트가 특정 세션의 타이밍 데이터를 요청할 때 사용
   * 
   * @param data 세션 ID 정보
   * @param client 소켓 클라이언트
   */
  @SubscribeMessage('join-session')
  async handleJoinSession(
    @MessageBody() data: { sessionId: number }, 
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const { sessionId } = data;
    const clientId = client.id;
    
    this.logger.log(`클라이언트 ${clientId}가 세션 ${sessionId}에 참가 요청`);
    this.logger.debug(`받은 데이터: ${JSON.stringify(data)}`);
    
    try {
      // 기존 세션에 참가 중이었다면 먼저 떠나기
      const clientInfo = this.connectedClients.get(clientId);
      if (clientInfo && clientInfo.sessionId) {
        this.replayService.stopReplay(clientId);
      }
      
      // 세션 정보 업데이트
      this.connectedClients.set(clientId, {
        ...clientInfo!,
        sessionId,
      });
      
      // 세션 룸에 참가
      client.join(`session-${sessionId}`);
      
      // 세션 정보 조회 및 전송
      const sessionInfo = await this.replayService.getSessionInfo(sessionId);
      
      const infoMessage: SessionInfoMessage = {
        type: 'SESSION_INFO',
        session: sessionInfo.session,
        event: sessionInfo.event,
        circuit: sessionInfo.circuit,
        timestamp: new Date().toISOString(),
      };
      
      this.logger.log(`세션 정보 전송: ${JSON.stringify(infoMessage)}`);
      client.emit('message', infoMessage);
    } catch (error) {
      this.logger.error(`세션 참가 처리 중 오류: ${error instanceof Error ? error.message : String(error)}`);
      this.handleError(client, `세션 참가 중 오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 재생 제어 메시지 구독
   * 
   * 클라이언트가 타이밍 데이터 재생을 제어할 때 사용
   * 
   * @param data 재생 제어 명령 (시작, 일시정지, 정지, 탐색)
   * @param client 소켓 클라이언트
   */
  @SubscribeMessage('replay-control')
  handleReplayControl(
    @MessageBody() data: ReplayControlMessage,
    @ConnectedSocket() client: Socket
  ): void {
    const clientId = client.id;
    const clientInfo = this.connectedClients.get(clientId);
    
    this.logger.log(`클라이언트 ${clientId}가 재생 제어 요청: ${JSON.stringify(data)}`);
    
    if (!clientInfo || !clientInfo.sessionId) {
      this.logger.warn(`클라이언트 ${clientId}가 세션에 참가하지 않은 상태에서 재생 제어 시도`);
      return this.handleError(client, '세션에 먼저 참가해주세요.');
    }
    
    const { sessionId, type } = data;
    
    this.logger.log(`클라이언트 ${clientId}가 세션 ${sessionId}에 대해 ${type} 요청`);
    
    try {
      switch (type) {
        case 'START':
          this.logger.log(`세션 ${sessionId} 재생 시작 (속도: ${data.speed || 1})`);
          this.replayService.startReplay(
            clientId, 
            sessionId, 
            (data) => this.sendTimingUpdate(client, data),
            data.speed,
          );
          break;
          
        case 'PAUSE':
          this.logger.log(`세션 ${sessionId} 재생 일시정지`);
          this.replayService.pauseReplay(clientId);
          break;
          
        case 'STOP':
          this.logger.log(`세션 ${sessionId} 재생 정지`);
          this.replayService.stopReplay(clientId);
          break;
          
        case 'SEEK':
          if (data.timestamp !== undefined) {
            this.logger.log(`세션 ${sessionId} 재생 시간 이동: ${data.timestamp}초`);
            this.replayService.seekReplay(clientId, data.timestamp);
          } else {
            this.handleError(client, '탐색 시간이 지정되지 않았습니다.');
          }
          break;
          
        default:
          this.handleError(client, `지원하지 않는 제어 명령: ${type}`);
      }
    } catch (error) {
      this.logger.error(`재생 제어 처리 중 오류: ${error instanceof Error ? error.message : String(error)}`);
      this.handleError(client, `재생 제어 중 오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 타이밍 업데이트 데이터 전송
   * 
   * @param client 소켓 클라이언트
   * @param data 타이밍 데이터
   */
  private sendTimingUpdate(client: Socket, data: TimingUpdateMessage): void {
    client.emit('message', data);
  }

  /**
   * 타이밍 업데이트 브로드캐스팅
   * 
   * @param sessionId 세션 ID
   * @param data 타이밍 데이터
   */
  broadcastTimingUpdate(sessionId: number, data: TimingUpdateMessage): void {
    this.server.to(`session-${sessionId}`).emit('message', data);
  }

  /**
   * 에러 메시지 전송
   * 
   * @param client 소켓 클라이언트
   * @param message 에러 메시지
   */
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
