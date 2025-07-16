import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class DriverDTO {
  @Expose({ name: 'driver_id' })
  driverId: number;

  @Expose({ name: 'driver_number' })
  driverNumber: string;

  @Expose({ name: 'code' })
  code: string;

  @Expose({ name: 'full_name' })
  fullName: string;

  @Expose({ name: 'first_name' })
  firstName: string;

  @Expose({ name: 'last_name' })
  lastName: string;

  @Expose({ name: 'team_name' })
  teamName: string;

  @Expose({ name: 'country_code' })
  countryCode: string;

  @Expose({ name: 'is_active' })
  isActive: boolean;
}
