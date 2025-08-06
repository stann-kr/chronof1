# ChronoF1 Mock API Server

이 Mock 서버는 프론트엔드 개발자들이 ChronoF1 API를 테스트할 수 있도록 제공되는 간단한 Express.js 기반 서버입니다.

## 🏎️ 주요 기능

- **REST API Mock**: 모든 F1 라이브 타이밍 API 엔드포인트 시뮬레이션
- **WebSocket Mock**: Socket.IO를 통한 실시간 F1 라이브 타이밍 데이터 시뮬레이션
- **CORS 지원**: 프론트엔드 개발 서버와의 연동 지원

## 🚀 설치 및 실행

```bash
# Mock 서버 디렉토리로 이동
cd apps/web/src/mock-server

# 의존성 설치
npm install

# 서버 실행 (개발 모드)
npm run dev
```

서버가 실행되면:
- REST API: http://localhost:3001
- WebSocket: ws://localhost:3001/live-timing

## 📡 API 엔드포인트

### 1. 시즌 목록 조회
```
GET /live-timing/seasons
```

### 2. 특정 연도 이벤트 목록
```
GET /live-timing/seasons/{year}/events
```

### 3. 세션 목록
```
GET /live-timing/events/{eventId}/sessions
```

### 4. 드라이버 목록
```
GET /live-timing/sessions/{sessionId}/drivers
```

### 5. 라이브 데이터 상태
```
GET /live-timing/sessions/{sessionId}/live-status
```

### 6. WebSocket 정보
```
GET /live-timing/websocket-info
```

## 🔌 WebSocket 사용법

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// 세션 참가
socket.emit('join-session', { sessionId: 1 });

// 청크 데이터 수신 (30초마다)
socket.on('chunk-data', (data) => {
  console.log('청크 데이터:', data);
});

// 재생 위치 수신 (1초마다)
socket.on('playback-position', (data) => {
  console.log('재생 위치:', data);
});

// 연결 상태
socket.on('message', (data) => {
  console.log('메시지:', data);
});
```

## ⚠️ 중요 사항

- **Mock 데이터**: 실제 F1 데이터가 아닌 시뮬레이션 데이터입니다
- **개발용**: 프론트엔드 개발 및 테스트 목적으로만 사용
- **포트**: 기본 포트 3001 사용 (백엔드 API 3000과 충돌 방지)

## 🎯 사용 예시

프론트엔드 개발 시 다음과 같이 활용:

```javascript
// API 기본 URL을 Mock 서버로 설정
const API_BASE_URL = 'http://localhost:3001';

// 시즌 데이터 조회
const seasons = await fetch(`${API_BASE_URL}/live-timing/seasons`).then(r => r.json());
```

## 🏁 F1 아키텍처 시뮬레이션

Mock 서버는 실제 ChronoF1 시스템의 아키텍처를 모방합니다:

1. **청크 기반 데이터 전송**: 30초마다 120초 분량의 데이터 청크 전송
2. **재생 위치 업데이트**: 1초마다 현재 재생 위치와 속도 전송
3. **실시간 UI 업데이트**: 프론트엔드가 100ms마다 UI 업데이트 수행

이를 통해 프론트엔드 개발자는 실제 백엔드 없이도 완전한 F1 라이브 타이밍 경험을 테스트할 수 있습니다.
