import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { IngestService } from '../services/ingest.service';

@Controller('api/ingest')
export class IngestController {
  constructor(private ingestService: IngestService) {}

  @Get('sessions')
  async listAvailableSessions(@Query('year') year?: number) {
    const sessions = await this.ingestService.listAvailableSessions(
      year ? Number(year) : undefined,
    );
    return {
      success: true,
      data: sessions,
    };
  }

  @Post('fastf1')
  async importFromFastF1(
    @Body() data: { year: number; round: number; sessionType: string },
  ) {
    const { year, round, sessionType } = data;

    try {
      const result = await this.ingestService.importSessionFromFastF1(
        Number(year),
        Number(round),
        sessionType,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as any).message,
      };
    }
  }

  @Post('jolpica')
  async importFromJolpica(@Body() data: { sessionKey: string }) {
    const { sessionKey } = data;

    try {
      const result =
        await this.ingestService.importTimingFromJolpica(sessionKey);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as any).message,
      };
    }
  }
}
