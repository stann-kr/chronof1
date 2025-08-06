import { Module } from '@nestjs/common';
import { FastF1IngestService } from './services/fastf1-ingest.service';
import { IngestController } from './controllers/ingest.controller';

@Module({
  providers: [FastF1IngestService],
  controllers: [IngestController],
  exports: [FastF1IngestService],
})
export class IngestModule {}
