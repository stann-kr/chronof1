import { Controller, Get, Param, Query } from '@nestjs/common';
import { ResultsService } from '../services/results.service';

@Controller('api/results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

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
