import { ApiProperty } from '@nestjs/swagger';

/**
 * 드라이버 정보 DTO
 * F1 드라이버 정보를 나타냅니다.
 */
export class DriverDto {
  @ApiProperty({
    description: '드라이버 ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '드라이버 번호',
    example: 4,
    required: false,
  })
  number?: number;

  @ApiProperty({
    description: '드라이버 코드 (3글자)',
    example: 'NOR',
  })
  code!: string;

  @ApiProperty({
    description: '드라이버 전체 이름',
    example: 'Lando Norris',
  })
  fullName!: string;

  @ApiProperty({
    description: '국적',
    example: 'British',
    required: false,
  })
  nationality?: string;
}

/**
 * 팀 정보 DTO
 * F1 팀(컨스트럭터) 정보를 나타냅니다.
 */
export class TeamDto {
  @ApiProperty({
    description: '팀 ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '팀 이름',
    example: 'McLaren F1 Team',
  })
  name!: string;

  @ApiProperty({
    description: '팀 짧은 이름',
    example: 'McLaren',
    required: false,
  })
  shortName?: string;

  @ApiProperty({
    description: '팀 색상 (HEX)',
    example: '#FF8700',
    required: false,
  })
  color?: string;
}

/**
 * 세션별 드라이버 정보 DTO
 * 특정 세션에서의 드라이버 정보를 나타냅니다.
 */
export class SessionDriverDto {
  @ApiProperty({
    description: '드라이버 세션 ID',
    example: 101,
  })
  id!: number;

  @ApiProperty({
    description: '차량 번호',
    example: 4,
  })
  carNumber!: number;

  @ApiProperty({
    description: '최종 포지션',
    example: 1,
    required: false,
  })
  position?: number;

  @ApiProperty({
    description: '그리드 포지션',
    example: 2,
    required: false,
  })
  gridPosition?: number;

  @ApiProperty({
    description: '상태',
    example: 'Finished',
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: '획득 포인트',
    example: 25,
    required: false,
  })
  points?: number;

  @ApiProperty({
    description: '드라이버 정보',
    type: DriverDto,
  })
  driver!: DriverDto;

  @ApiProperty({
    description: '팀 정보',
    type: TeamDto,
  })
  team!: TeamDto;
}
