import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { 
  SeasonDto, 
  EventDto, 
  SessionDto, 
  SessionDriverDto 
} from '../dto';

/**
 * 라이브 타이밍 서비스
 * 라이브 타이밍 관련 데이터를 조회하는 비즈니스 로직을 담당합니다.
 */
@Injectable()
export class LiveTimingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 모든 시즌 목록을 조회합니다.
   * @returns 시즌 목록
   */
  async getAllSeasons(): Promise<SeasonDto[]> {
    const seasons = await this.prisma.commonSeason.findMany({
      orderBy: { year: 'desc' },
    });

    return seasons.map(season => ({
      id: season.id,
      year: season.year,
      name: season.name ?? undefined,
      startDate: season.startDate ?? undefined,
      endDate: season.endDate ?? undefined,
    }));
  }

  /**
   * 특정 연도의 이벤트 목록을 조회합니다.
   * @param year 조회할 연도
   * @returns 해당 연도의 이벤트 목록
   */
  async getEventsByYear(year: number): Promise<EventDto[]> {
    const events = await this.prisma.commonEvent.findMany({
      where: {
        season: { year },
      },
      include: {
        circuit: true,
        liveSessions: {
          include: {
            driverSessions: true,
          },
        },
      },
      orderBy: { round: 'asc' },
    });

    return events.map(event => ({
      id: event.id,
      seasonId: event.seasonId,
      round: event.round,
      name: event.name,
      shortName: event.shortName ?? undefined,
      eventStart: event.eventStart,
      eventEnd: event.eventEnd,
      status: event.status ?? undefined,
      // 라이브 세션이 있고, 드라이버 세션 데이터가 있으면 라이브 타이밍 지원
      hasLiveTiming: event.liveSessions.length > 0 && 
                     event.liveSessions.some(session => session.driverSessions.length > 0),
      circuit: {
        id: event.circuit.id,
        name: event.circuit.name,
        shortName: event.circuit.shortName ?? undefined,
        locality: event.circuit.locality ?? undefined,
        country: event.circuit.country ?? undefined,
        length: event.circuit.length ?? undefined,
        turns: event.circuit.turns ?? undefined,
      },
    }));
  }

  /**
   * 특정 이벤트의 세션 목록을 조회합니다.
   * @param eventId 이벤트 ID
   * @returns 해당 이벤트의 세션 목록
   */
  async getSessionsByEvent(eventId: number): Promise<SessionDto[]> {
    const sessions = await this.prisma.commonSession.findMany({
      where: { eventId },
      include: {
        liveSessions: {
          include: {
            driverSessions: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    return sessions.map(session => ({
      id: session.id,
      eventId: session.eventId,
      type: session.type,
      name: session.name,
      date: session.date,
      duration: session.duration ?? undefined,
      status: session.status ?? undefined,
      // 라이브 세션이 있고, 드라이버 세션 데이터가 있으면 라이브 데이터 있음
      hasLiveData: session.liveSessions.length > 0 && 
                   session.liveSessions.some(liveSession => liveSession.driverSessions.length > 0),
    }));
  }

  /**
   * 특정 세션의 드라이버 목록을 조회합니다.
   * @param sessionId 세션 ID (common_sessions의 ID)
   * @returns 해당 세션의 드라이버 목록
   */
  async getDriversBySession(sessionId: number): Promise<SessionDriverDto[]> {
    // 먼저 해당 세션에 연결된 라이브 세션을 찾습니다
    const liveSessions = await this.prisma.liveSession.findMany({
      where: { commonSessionId: sessionId },
      include: {
        driverSessions: {
          include: {
            driver: true,
            team: true,
          },
          orderBy: { carNumber: 'asc' },
        },
      },
    });

    if (liveSessions.length === 0) {
      return [];
    }

    // 첫 번째 라이브 세션의 드라이버들을 반환 (일반적으로 세션당 하나의 라이브 세션만 있음)
    const liveSession = liveSessions[0];
    
    if (!liveSession) {
      return [];
    }
    
    return liveSession.driverSessions.map(driverSession => ({
      id: driverSession.id,
      carNumber: driverSession.carNumber,
      position: driverSession.position ?? undefined,
      gridPosition: driverSession.gridPosition ?? undefined,
      status: driverSession.status ?? undefined,
      points: driverSession.points ?? undefined,
      driver: {
        id: driverSession.driver.id,
        number: driverSession.driver.number ?? undefined,
        code: driverSession.driver.code,
        fullName: driverSession.driver.fullName,
        nationality: driverSession.driver.nationality ?? undefined,
      },
      team: {
        id: driverSession.team.id,
        name: driverSession.team.name,
        shortName: driverSession.team.shortName ?? undefined,
        color: driverSession.team.color ?? undefined,
      },
    }));
  }

  /**
   * 특정 세션이 라이브 타이밍 데이터를 가지고 있는지 확인합니다.
   * @param sessionId 세션 ID
   * @returns 라이브 데이터 보유 여부
   */
  async hasLiveTimingData(sessionId: number): Promise<boolean> {
    const liveSession = await this.prisma.liveSession.findFirst({
      where: { commonSessionId: sessionId },
      include: {
        driverSessions: {
          include: {
            laps: true,
          },
        },
      },
    });

    if (!liveSession) return false;

    // 드라이버 세션이 있고, 랩 데이터가 있으면 라이브 타이밍 데이터 있음
    return liveSession.driverSessions.length > 0 && 
           liveSession.driverSessions.some(ds => ds.laps.length > 0);
  }
}
