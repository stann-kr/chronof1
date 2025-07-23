import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ResultsController } from './controllers/results.controller';
import { ResultsService } from './services/results.service';

@Module({
  imports: [HttpModule], // HttpModule을 imports에 추가해야 HttpService를 DI로 사용할 수 있습니다.
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}
