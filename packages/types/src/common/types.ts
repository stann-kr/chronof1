/**
 * 공통 타입 정의
 */

export type LapTime = number | null;  // milliseconds
export type Sector = number | null;   // milliseconds

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DriverTiming {
  driverNumber: string;
  position: number;
  gapToLeader: number | null;
  interval: number | null;
  lastLapTime: LapTime;
  bestLapTime: LapTime;
  sector1Time: Sector;
  sector2Time: Sector;
  sector3Time: Sector;
  compound: string | null;
  tyreAge: number | null;
}

export interface ReplayOptions {
  speed: number;
  startFrame?: number;
  endFrame?: number;
}
