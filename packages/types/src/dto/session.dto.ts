import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class SessionDTO {
  @Expose({ name: 'session_key' })
  sessionKey: string;

  @Expose({ name: 'year' })
  year: number;

  @Expose({ name: 'round' })
  round: number;

  @Expose({ name: 'event_name' })
  eventName: string;

  @Expose({ name: 'session_name' })
  sessionName: string;

  @Expose({ name: 'session_type' })
  sessionType: string;

  @Expose({ name: 'circuit_name' })
  circuitName: string;

  @Expose({ name: 'circuit_short_name' })
  circuitShortName: string;

  @Expose({ name: 'start_date' })
  @Type(() => Date)
  startDate: Date;

  @Expose({ name: 'end_date' })
  @Type(() => Date)
  endDate: Date;

  @Expose({ name: 'has_timing_data' })
  hasTiming: boolean;
}
