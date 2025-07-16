import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ReplayService } from './services/replay.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'replay',
})
export class ReplayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private replayService: ReplayService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // 연결이 끊기면 진행 중인 리플레이도 중지
    const activeSessions = Array.from(client.rooms).filter(room => room !== client.id);
    for (const sessionKey of activeSessions) {
      this.replayService.stopReplay(sessionKey, client);
    }
  }

  @SubscribeMessage('replay:join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionKey: string },
  ) {
    const { sessionKey } = data;
    await client.join(sessionKey);
    
    const metadata = await this.replayService.getSessionMetadata(sessionKey);
    
    return {
      event: 'replay:metadata',
      data: metadata,
    };
  }

  @SubscribeMessage('replay:leave')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionKey: string },
  ) {
    const { sessionKey } = data;
    this.replayService.stopReplay(sessionKey, client);
    await client.leave(sessionKey);
    
    return {
      event: 'replay:left',
      data: { sessionKey },
    };
  }

  @SubscribeMessage('replay:start')
  async handleStartReplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionKey: string; options?: any },
  ) {
    const { sessionKey, options = {} } = data;
    const result = await this.replayService.startReplay(sessionKey, options, client);
    
    return {
      event: 'replay:started',
      data: result,
    };
  }

  @SubscribeMessage('replay:stop')
  async handleStopReplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionKey: string },
  ) {
    const { sessionKey } = data;
    const stopped = this.replayService.stopReplay(sessionKey, client);
    
    return {
      event: 'replay:stopped',
      data: { sessionKey, stopped },
    };
  }

  @SubscribeMessage('replay:pause')
  async handlePauseReplay(
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.replayService.pauseReplay(client);
    
    return {
      event: 'replay:paused',
      data: result,
    };
  }

  @SubscribeMessage('replay:resume')
  async handleResumeReplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { options?: { speed?: number } },
  ) {
    const { options = {} } = data;
    const result = this.replayService.resumeReplay(client, options);
    
    return {
      event: 'replay:resumed',
      data: result,
    };
  }

  @SubscribeMessage('replay:seek')
  async handleSeekReplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionKey: string; frameNumber: number },
  ) {
    const { sessionKey, frameNumber } = data;
    
    try {
      const frameData = await this.replayService.getTimingFrame(sessionKey, frameNumber);
      if (frameData) {
        return {
          event: 'replay:frame',
          data: frameData,
        };
      } else {
        return {
          event: 'replay:error',
          data: { error: 'Frame not found' },
        };
      }
    } catch (error) {
      return {
        event: 'replay:error',
        data: { error: (error as any).message },
      };
    }
  }
}
