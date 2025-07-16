import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimingFrameDTO } from '@f1/types';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ReplayRepository {
  constructor(private prisma: PrismaService) {}

  async findSessionMetadata(sessionKey: string) {
    return this.prisma.session.findUnique({
      where: { session_key: sessionKey },
    });
  }

  async findFramesMetadata(sessionKey: string) {
    const firstFrame = await this.prisma.timing.findFirst({
      where: { session_key: sessionKey },
      orderBy: { frame_number: 'asc' },
      select: { frame_number: true, timestamp: true },
    });

    const lastFrame = await this.prisma.timing.findFirst({
      where: { session_key: sessionKey },
      orderBy: { frame_number: 'desc' },
      select: { frame_number: true, timestamp: true },
    });

    const totalFrames = await this.prisma.timing.groupBy({
      by: ['frame_number'],
      where: { session_key: sessionKey },
      _count: true,
    });

    return {
      firstFrame: firstFrame?.frame_number || 0,
      lastFrame: lastFrame?.frame_number || 0,
      totalFrames: totalFrames?.length || 0,
      startTime: firstFrame?.timestamp,
      endTime: lastFrame?.timestamp,
    };
  }

  async getTimingFrame(sessionKey: string, frameNumber: number): Promise<TimingFrameDTO | null> {
    const frameData = await this.prisma.timing.findMany({
      where: {
        session_key: sessionKey,
        frame_number: frameNumber,
      },
    });

    if (frameData.length === 0) {
      return null;
    }

    // 타이밍 프레임을 구성
    const timestamp = frameData[0].timestamp;
    const drivers: { [key: number]: any } = {};

    for (const entry of frameData) {
      drivers[entry.driver_number] = {
        driver_number: entry.driver_number,
        position: entry.position,
        gap_to_leader: entry.gap_to_leader,
        interval: entry.interval,
        last_lap_time: entry.last_lap_time,
        best_lap_time: entry.best_lap_time,
        sector1_time: entry.sector1_time,
        sector2_time: entry.sector2_time,
        sector3_time: entry.sector3_time,
        compound: entry.compound,
        tyre_age: entry.tyre_age,
        timestamp: entry.timestamp,
      };
    }

    const frame = {
      session_key: sessionKey,
      frame_number: frameNumber,
      timestamp,
      drivers,
    };

    return plainToInstance(TimingFrameDTO, frame);
  }
}
