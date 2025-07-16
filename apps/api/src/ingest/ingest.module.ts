import { Module } from '@nestjs/common';
import { IngestController } from './controllers/ingest.controller';
import { IngestService } from './services/ingest.service';

@Module({
  controllers: [IngestController],
  providers: [IngestService],
  exports: [IngestService],
})
export class IngestModule {}
