import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class DriverTimingDTO {
  @Expose({ name: 'driver_number' })
  driverNumber: string;

  @Expose({ name: 'position' })
  position: number;

  @Expose({ name: 'gap_to_leader' })
  gapToLeader: number | null;

  @Expose({ name: 'interval' })
  interval: number | null;

  @Expose({ name: 'last_lap_time' })
  lastLapTime: number | null;

  @Expose({ name: 'best_lap_time' })
  bestLapTime: number | null;

  @Expose({ name: 'sector1_time' })
  sector1Time: number | null;

  @Expose({ name: 'sector2_time' })
  sector2Time: number | null;

  @Expose({ name: 'sector3_time' })
  sector3Time: number | null;

  @Expose({ name: 'compound' })
  compound: string | null;

  @Expose({ name: 'tyre_age' })
  tyreAge: number | null;

  @Expose({ name: 'timestamp' })
  @Type(() => Date)
  timestamp: Date;
}

@Exclude()
export class TimingFrameDTO {
  @Expose({ name: 'session_key' })
  sessionKey: string;
  
  @Expose({ name: 'timestamp' })
  @Type(() => Date)
  timestamp: Date;
  
  @Expose({ name: 'frame_number' })
  frameNumber: number;
  
  @Expose({ name: 'drivers' })
  @Type(() => DriverTimingDTO)
  drivers: Record<string, DriverTimingDTO>;
}
