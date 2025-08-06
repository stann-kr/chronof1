import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateSwagger() {
  try {
    // AppModule import
    const { AppModule } = await import('../dist/app.module.js');

    const app = await NestFactory.create(AppModule, { logger: false });
    
    const config = new DocumentBuilder()
      .setTitle('ChronoF1 API')
      .setDescription(`
        🏎️ **ChronoF1 - F1 Live Timing & Historical Data API**
        
        Formula 1의 역사적 결과 데이터와 2018년 이후 라이브 타이밍 리플레이를 제공하는 종합 API입니다.
        
        ## 🚀 주요 기능
        - **라이브 타이밍**: WebSocket 기반 실시간 F1 세션 데이터
        - **히스토리 데이터**: 시즌, 이벤트, 세션, 드라이버 정보
        - **청크 기반 시스템**: 효율적인 대용량 데이터 전송
        
        ## 🔗 WebSocket 연결
        - **URL**: ws://localhost:3000/live-timing
        - **프로토콜**: Socket.IO
        - **데이터**: F1 텔레메트리, 타이밍, 위치 정보
        
        ## 📊 데이터 소스
        FastF1 라이브러리를 사용하여 공식 F1 데이터를 수집합니다.
      `)
      .setVersion('1.0.0')
      .addTag('라이브 타이밍', 'F1 실시간/리플레이 데이터 API')
      .addServer('http://localhost:3000', '개발 서버')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    
    // Swagger JSON 파일 생성
    const outputPath = path.join(__dirname, '../swagger.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    
    // Web 앱으로 복사
    const webOutputPath = path.join(__dirname, '../../web/public/api-docs/swagger.json');
    fs.mkdirSync(path.dirname(webOutputPath), { recursive: true });
    fs.writeFileSync(webOutputPath, JSON.stringify(document, null, 2));
    
    console.log('✅ Swagger JSON 생성 완료:');
    console.log(`   - API: ${outputPath}`);
    console.log(`   - Web: ${webOutputPath}`);
    
    await app.close();
  } catch (error) {
    console.error('❌ Swagger 생성 실패:', error.message);
    process.exit(1);
  }
}

generateSwagger();
