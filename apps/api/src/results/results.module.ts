import { Module } from '@nestjs/common';
import { ResultsController } from './controllers/results.controller';
import { ResultsService } from './services/results.service';
import { ResultsRepository } from './repositories/results.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResultsController],
  providers: [ResultsService, ResultsRepository],
  exports: [ResultsService],
})
export class ResultsModule {}
