import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ResultsModule } from './modules/results/results.module';
import { ConfigModule } from './config/config.module';
import { IngestModule } from './ingest/ingest.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ResultsModule,
    IngestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
