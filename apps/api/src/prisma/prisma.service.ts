import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // 쿼리 로그 제거: 개발 환경에서도 error와 warn만 출력
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  // Prisma v5 이상에서는 $on('beforeExit') 지원되지 않으므로 해당 메서드 제거
}
