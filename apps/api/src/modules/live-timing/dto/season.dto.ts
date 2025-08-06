import { ApiProperty } from '@nestjs/swagger';

/**
 * 시즌 정보 DTO
 * 연도별 F1 시즌 정보를 나타냅니다.
 */
export class SeasonDto {
  @ApiProperty({
    description: '시즌 ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '시즌 연도',
    example: 2025,
  })
  year!: number;

  @ApiProperty({
    description: '시즌 공식 명칭',
    example: 'FIA Formula One World Championship 2025',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: '시즌 시작일',
    example: '2025-03-16T00:00:00Z',
    required: false,
  })
  startDate?: Date;

  @ApiProperty({
    description: '시즌 종료일',
    example: '2025-12-07T23:59:59Z',
    required: false,
  })
  endDate?: Date;
}
