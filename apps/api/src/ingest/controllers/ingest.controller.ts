import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { FastF1IngestService } from '../services/fastf1-ingest.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('ingest')
@Controller('ingest')
export class IngestController {
  private readonly logger = new Logger(IngestController.name);

  constructor(private readonly fastF1IngestService: FastF1IngestService) {}

  @Get('check')
  @ApiOperation({
    summary: 'Python 환경 확인',
    description: 'FastF1 ETL을 위한 Python 환경이 올바르게 설정되었는지 확인합니다.',
  })
  @ApiResponse({ status: 200, description: '환경 확인 결과', type: Boolean })
  async checkEnvironment() {
    this.logger.log('Python 환경 확인 요청 받음');
    const result = await this.fastF1IngestService.checkEnvironment();
    return { success: result };
  }

  @Post('install-deps')
  @ApiOperation({
    summary: 'Python 의존성 설치',
    description: 'FastF1 및 필요한 Python 패키지를 설치합니다.',
  })
  @ApiResponse({ status: 200, description: '설치 결과', type: Boolean })
  async installDependencies() {
    this.logger.log('Python 의존성 설치 요청 받음');
    const result = await this.fastF1IngestService.installDependencies();
    return { success: result };
  }

  @Post('season')
  @ApiOperation({ summary: '시즌 데이터 적재', description: '특정 시즌의 F1 데이터를 적재합니다.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        year: { type: 'number', example: 2023 },
        round: { type: 'number', example: 1, nullable: true },
        includeTelemetry: { type: 'boolean', example: false },
      },
      required: ['year'],
    },
  })
  @ApiResponse({ status: 200, description: '적재 결과', type: Boolean })
  async ingestSeason(
    @Body('year') year: number,
    @Body('round') round?: number,
    @Body('includeTelemetry') includeTelemetry?: boolean,
  ) {
    this.logger.log(
      `시즌 ${year} 데이터 적재 요청 받음 (라운드: ${round || '전체'}, 텔레메트리: ${includeTelemetry ? '포함' : '제외'})`,
    );
    const result = await this.fastF1IngestService.ingestSeason(year, { round, includeTelemetry });
    return { success: result };
  }

  @Post('season-range')
  @ApiOperation({
    summary: '시즌 범위 데이터 적재',
    description: '특정 시즌 범위의 F1 데이터를 적재합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        startYear: { type: 'number', example: 2020 },
        endYear: { type: 'number', example: 2023 },
        includeTelemetry: { type: 'boolean', example: false },
      },
      required: ['startYear', 'endYear'],
    },
  })
  @ApiResponse({ status: 200, description: '적재 결과', type: Boolean })
  async ingestSeasonRange(
    @Body('startYear') startYear: number,
    @Body('endYear') endYear: number,
    @Body('includeTelemetry') includeTelemetry?: boolean,
  ) {
    this.logger.log(
      `시즌 범위 ${startYear}-${endYear} 데이터 적재 요청 받음 (텔레메트리: ${includeTelemetry ? '포함' : '제외'})`,
    );
    const result = await this.fastF1IngestService.ingestSeasonRange(startYear, endYear, {
      includeTelemetry,
    });
    return { success: result };
  }
}
