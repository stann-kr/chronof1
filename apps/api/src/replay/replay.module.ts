import { Module } from '@nestjs/common';
import { ReplayGateway } from './replay.gateway';
import { ReplayService } from './services/replay.service';
import { ReplayRepository } from './repositories/replay.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ReplayGateway, ReplayService, ReplayRepository],
  exports: [ReplayService],
})
export class ReplayModule {}
