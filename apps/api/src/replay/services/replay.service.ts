import { Injectable } from '@nestjs/common';
import { ReplayRepository } from '../repositories/replay.repository';
import { TimingFrameDTO, ReplayOptions } from '@f1/types';

@Injectable()
export class ReplayService {
  private activeSessions = new Map<string, any>();

  constructor(private replayRepository: ReplayRepository) {}

  async getSessionMetadata(sessionKey: string) {
    const session = await this.replayRepository.findSessionMetadata(sessionKey);
    if (!session) {
      return null;
    }

    const framesMetadata = await this.replayRepository.findFramesMetadata(sessionKey);
    return {
      session,
      frames: framesMetadata
    };
  }

  async getTimingFrame(sessionKey: string, frameNumber: number): Promise<TimingFrameDTO | null> {
    return this.replayRepository.getTimingFrame(sessionKey, frameNumber);
  }

  async startReplay(sessionKey: string, options: ReplayOptions, client: any) {
    const metadata = await this.getSessionMetadata(sessionKey);
    if (!metadata) {
      return { error: 'Session not found' };
    }

    // 이미 실행 중인 리플레이가 있으면 중지
    this.stopReplay(sessionKey, client);

    const speed = options.speed || 1;
    const startFrame = options.startFrame || metadata.frames.firstFrame;
    const endFrame = options.endFrame || metadata.frames.lastFrame;

    // 60fps로 타이밍 데이터 전송
    const interval = Math.floor(1000 / (60 * speed));
    let currentFrame = startFrame;

    const intervalId = setInterval(async () => {
      if (currentFrame > endFrame) {
        this.stopReplay(sessionKey, client);
        client.emit('replay:completed', { sessionKey });
        return;
      }

      try {
        const frameData = await this.getTimingFrame(sessionKey, currentFrame);
        if (frameData) {
          client.emit('replay:frame', frameData);
        }
        currentFrame++;
      } catch (error) {
        console.error('Error sending frame:', error);
      }
    }, interval);

    // 현재 세션 정보 저장
    this.activeSessions.set(client.id, {
      sessionKey,
      intervalId,
      currentFrame,
      endFrame,
    });

    return {
      started: true,
      sessionKey,
      startFrame,
      endFrame,
      speed,
    };
  }

  stopReplay(sessionKey: string, client: any) {
    const session = this.activeSessions.get(client.id);
    if (session && session.intervalId) {
      clearInterval(session.intervalId);
      this.activeSessions.delete(client.id);
      return true;
    }
    return false;
  }

  pauseReplay(client: any) {
    const session = this.activeSessions.get(client.id);
    if (session && session.intervalId) {
      clearInterval(session.intervalId);
      session.intervalId = null;
      return {
        paused: true,
        currentFrame: session.currentFrame,
      };
    }
    return { paused: false };
  }

  resumeReplay(client: any, options: { speed?: number } = {}) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { resumed: false };
    }

    if (session.intervalId) {
      return { resumed: false, error: 'Replay is already running' };
    }

    const speed = options.speed || 1;
    const interval = Math.floor(1000 / (60 * speed));

    // 새로운 인터벌 시작
    session.intervalId = setInterval(async () => {
      if (session.currentFrame > session.endFrame) {
        this.stopReplay(session.sessionKey, client);
        client.emit('replay:completed', { sessionKey: session.sessionKey });
        return;
      }

      try {
        const frameData = await this.getTimingFrame(session.sessionKey, session.currentFrame);
        if (frameData) {
          client.emit('replay:frame', frameData);
        }
        session.currentFrame++;
      } catch (error) {
        console.error('Error sending frame:', error);
      }
    }, interval);

    return {
      resumed: true,
      currentFrame: session.currentFrame,
      speed,
    };
  }
}
