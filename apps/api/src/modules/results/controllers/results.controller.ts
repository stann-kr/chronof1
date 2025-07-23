import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ResultsService } from '../services/results.service';

@ApiTags('레이스 결과')
@Controller('results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  /**
   * 시즌별 레이스(라운드) 목록 조회
   * @param year 조회할 시즌(연도)
   * @returns 해당 시즌의 모든 레이스(라운드) 정보
   */
  @Get('races')
  @ApiOperation({
    summary: '시즌별 레이스(라운드) 목록 조회',
    description: '특정 시즌(year)의 모든 F1 레이스 정보를 반환합니다.',
  })
  @ApiQuery({
    name: 'year',
    type: Number,
    required: true,
    description: '조회할 시즌(연도)',
  })
  @ApiResponse({
    status: 200,
    description: '성공적으로 레이스 목록을 반환',
    schema: {
      example: {
        success: true,
        data: [
          {
            season: '2024',
            round: '1',
            url: 'https://en.wikipedia.org/wiki/2024_Bahrain_Grand_Prix',
            raceName: 'Bahrain Grand Prix',
            Circuit: {
              circuitId: 'bahrain',
              url: 'https://en.wikipedia.org/wiki/Bahrain_International_Circuit',
              circuitName: 'Bahrain International Circuit',
              Location: {
                lat: '26.0325',
                long: '50.5106',
                locality: 'Sakhir',
                country: 'Bahrain',
              },
            },
            date: '2024-03-02',
            time: '15:00:00Z',
            FirstPractice: { date: '2024-02-29', time: '11:30:00Z' },
            SecondPractice: { date: '2024-02-29', time: '15:00:00Z' },
            ThirdPractice: { date: '2024-03-01', time: '12:30:00Z' },
            Qualifying: { date: '2024-03-01', time: '16:00:00Z' },
          },
          // ...다른 라운드 예시 생략
        ],
      },
    },
  })
  async getRacesBySeason(@Query('year') year: number) {
    if (!year) {
      return { success: false, error: 'year 파라미터가 필요합니다.' };
    }
    // Jolpica-F1 API에서 해당 시즌의 레이스 목록 조회
    const response = await this.resultsService.getSessionsByYear(year);
    // 필요한 데이터만 가공해서 반환 (예시: response.MRData.RaceTable.Races)
    const races = response?.MRData?.RaceTable?.Races ?? [];
    return { success: true, data: races };
  }

  @Get('sessions')
  async getAllSessions(@Query('year') year?: number) {
    if (year) {
      return {
        success: true,
        data: await this.resultsService.getSessionsByYear(Number(year)),
      };
    }

    return {
      success: true,
      data: await this.resultsService.getAllSessions(),
    };
  }

  @Get('sessions/:sessionKey')
  async getSessionByKey(@Param('sessionKey') sessionKey: string) {
    const session = await this.resultsService.getSessionByKey(sessionKey);

    if (!session) {
      return {
        success: false,
        error: `Session with key ${sessionKey} not found`,
      };
    }

    return {
      success: true,
      data: session,
    };
  }

  @Get('sessions/:sessionKey/results')
  async getSessionResults(@Param('sessionKey') sessionKey: string) {
    const results = await this.resultsService.getSessionResults(sessionKey);

    if (!results) {
      return {
        success: false,
        error: `Results for session ${sessionKey} not found`,
      };
    }

    return {
      success: true,
      data: results,
    };
  }
}
