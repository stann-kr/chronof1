import { ApiProperty } from '@nestjs/swagger';
import { CircuitDto } from './circuit.dto';

/**
 * 이벤트(그랑프리) 정보 DTO
 * F1 그랑프리 이벤트 정보를 나타냅니다.
 */
export class EventDto {
  @ApiProperty({
    description: '이벤트 ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '시즌 ID',
    example: 1,
  })
  seasonId!: number;

  @ApiProperty({
    description: '라운드 번호',
    example: 1,
  })
  round!: number;

  @ApiProperty({
    description: '그랑프리 이름',
    example: 'Australian Grand Prix',
  })
  name!: string;

  @ApiProperty({
    description: '그랑프리 짧은 이름',
    example: 'Australian GP',
    required: false,
  })
  shortName?: string;

  @ApiProperty({
    description: '이벤트 시작일',
    example: '2025-03-14T00:00:00Z',
  })
  eventStart!: Date;

  @ApiProperty({
    description: '이벤트 종료일',
    example: '2025-03-16T23:59:59Z',
  })
  eventEnd!: Date;

  @ApiProperty({
    description: '이벤트 상태',
    example: 'completed',
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: '라이브 타이밍 지원 여부',
    example: true,
  })
  hasLiveTiming!: boolean;

  @ApiProperty({
    description: '서킷 정보',
    type: CircuitDto,
  })
  circuit!: CircuitDto;
}
