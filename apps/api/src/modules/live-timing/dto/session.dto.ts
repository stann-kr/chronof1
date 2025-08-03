import { ApiProperty } from '@nestjs/swagger';

/**
 * 세션 정보 DTO
 * F1 세션 (연습, 예선, 레이스 등) 정보를 나타냅니다.
 */
export class SessionDto {
  @ApiProperty({
    description: '세션 ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '이벤트 ID',
    example: 1,
  })
  eventId!: number;

  @ApiProperty({
    description: '세션 타입',
    example: 'R',
    enum: ['FP1', 'FP2', 'FP3', 'Q', 'SQ', 'S', 'R'],
  })
  type!: string;

  @ApiProperty({
    description: '세션 이름',
    example: 'Race',
  })
  name!: string;

  @ApiProperty({
    description: '세션 날짜 및 시간',
    example: '2025-03-16T05:00:00Z',
  })
  date!: Date;

  @ApiProperty({
    description: '세션 지속 시간 (분)',
    example: 120,
    required: false,
  })
  duration?: number;

  @ApiProperty({
    description: '세션 상태',
    example: 'completed',
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: '라이브 타이밍 데이터 유무',
    example: true,
  })
  hasLiveData!: boolean;
}
