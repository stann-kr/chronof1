import { ApiProperty } from '@nestjs/swagger';

/**
 * 서킷 정보 DTO
 * F1 서킷(트랙) 정보를 나타냅니다.
 */
export class CircuitDto {
  @ApiProperty({
    description: '서킷 ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '서킷 이름',
    example: 'Albert Park Grand Prix Circuit',
  })
  name!: string;

  @ApiProperty({
    description: '서킷 짧은 이름',
    example: 'Albert Park',
    required: false,
  })
  shortName?: string;

  @ApiProperty({
    description: '서킷 위치 (도시)',
    example: 'Melbourne',
    required: false,
  })
  locality?: string;

  @ApiProperty({
    description: '서킷 위치 (국가)',
    example: 'Australia',
    required: false,
  })
  country?: string;

  @ApiProperty({
    description: '서킷 길이 (km)',
    example: 5.303,
    required: false,
  })
  length?: number;

  @ApiProperty({
    description: '코너 수',
    example: 14,
    required: false,
  })
  turns?: number;
}
