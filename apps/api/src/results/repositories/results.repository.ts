import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionDTO } from '@f1/types';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ResultsRepository {
  constructor(private prisma: PrismaService) {}

  async findAllSessions() {
    const sessions = await this.prisma.session.findMany({
      orderBy: [
        { year: 'desc' },
        { round: 'asc' },
      ],
    });
    
    return sessions.map((session: any) => plainToInstance(SessionDTO, session));
  }

  async findSessionsByYear(year: number) {
    const sessions = await this.prisma.session.findMany({
      where: { year },
      orderBy: { round: 'asc' },
    });
    
    return sessions.map((session: any) => plainToInstance(SessionDTO, session));
  }

  async findSessionByKey(sessionKey: string) {
    const session = await this.prisma.session.findUnique({
      where: { session_key: sessionKey },
    });
    
    return session ? plainToInstance(SessionDTO, session) : null;
  }

  async getSessionResults(sessionKey: string) {
    // 최종 결과 데이터 조회 (레이스의 마지막 프레임이나 퀄리파잉 최종 기록 등)
    const session = await this.prisma.session.findUnique({
      where: { session_key: sessionKey },
    });
    
    if (!session) {
      return null;
    }

    // 해당 세션의 마지막 타이밍 프레임 찾기
    const lastFrameNumber = await this.prisma.timing.findFirst({
      where: { session_key: sessionKey },
      orderBy: { frame_number: 'desc' },
      select: { frame_number: true },
    });

    if (!lastFrameNumber) {
      return [];
    }

    // 마지막 프레임의 모든 드라이버 타이밍 데이터 가져오기
    const results = await this.prisma.timing.findMany({
      where: { 
        session_key: sessionKey,
        frame_number: lastFrameNumber.frame_number,
      },
      orderBy: { position: 'asc' },
      include: {
        driver: true,
      },
    });

    return results;
  }
}
