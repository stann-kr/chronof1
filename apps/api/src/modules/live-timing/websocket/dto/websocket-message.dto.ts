/**
 * WebSocket 메시지 DTO
 * 클라이언트와 서버 간의 실시간 통신에 사용되는 메시지 타입을 정의합니다.
 */

/**
 * 클라이언트에서 서버로 보내는 재생 제어 메시지
 */
export interface ReplayControlMessage {
  /** 메시지 타입 */
  type: 'START' | 'PAUSE' | 'STOP' | 'SEEK';
  
  /** 세션 ID (common_sessions의 ID) */
  sessionId: number;
  
  /** 재생 속도 (1x = 1, 2x = 2, 5x = 5 등) */
  speed?: number;
  
  /** SEEK용 타임스탬프 (세션 시작 후 경과 초) */
  timestamp?: number;
}

/**
 * 드라이버별 실시간 타이밍 데이터
 */
export interface DriverTimingData {
  /** 드라이버 세션 ID */
  driverSessionId: number;
  
  /** 차량 번호 */
  carNumber: number;
  
  /** 현재 포지션 */
  position?: number;
  
  /** 랩 번호 */
  lapNumber?: number;
  
  /** 현재 랩 타임 (밀리초) */
  currentLapTime?: number;
  
  /** 베스트 랩 타임 (밀리초) */
  bestLapTime?: number;
  
  /** 마지막 랩 타임 (밀리초) */
  lastLapTime?: number;
  
  /** 1구간 타임 (밀리초) */
  sector1Time?: number;
  
  /** 2구간 타임 (밀리초) */
  sector2Time?: number;
  
  /** 3구간 타임 (밀리초) */
  sector3Time?: number;
  
  /** 속도 (km/h) */
  speed?: number;
  
  /** 스로틀 (0-100%) */
  throttle?: number;
  
  /** 브레이크 (0-100%) */
  brake?: number;
  
  /** 기어 (0=N, 1-8=기어단수) */
  gear?: number;
  
  /** RPM */
  rpm?: number;
  
  /** 드라이버 상태 (DRIVING, PIT, DNF 등) */
  status?: string;
  
  /** 타이어 컴파운드 */
  tireCompound?: string;
  
  /** 타이어 나이 (랩 수) */
  tireAge?: number;
  
  /** DRS 상태 (0=사용불가, 1=사용가능, 2=활성화) */
  drs?: number;

  /** 앞 차와의 거리 (미터) */
  distanceToDriverAhead?: number;
  
  /** 위치 데이터 */
  positionData?: {
    x: number;      // 트랙상 X 좌표
    y: number;      // 트랙상 Y 좌표
    z?: number;     // 트랙상 Z 좌표 (고도)
    angle?: number; // 트랙상 각도 (진행 방향)
  };
  
  /** 드라이버 기본 정보 */
  driver: {
    id: number;
    number?: number;
    code: string;
    fullName: string;
  };
  
  /** 팀 기본 정보 */
  team: {
    id: number;
    name: string;
    shortName?: string;
    color?: string;
  };
}

/**
 * 서버에서 클라이언트로 보내는 타이밍 업데이트 메시지
 */
export interface TimingUpdateMessage {
  /** 메시지 타입 */
  type: 'TIMING_UPDATE';
  
  /** 세션 ID */
  sessionId: number;
  
  /** 타임스탬프 (세션 시작 후 경과 초) */
  sessionTime: number;
  
  /** 현재 랩 번호 */
  currentLap?: number;
  
  /** 총 랩 수 */
  totalLaps?: number;
  
  /** 세션 상태 (STARTED, PAUSED, STOPPED, FINISHED) */
  sessionStatus: string;
  
  /** 드라이버별 타이밍 데이터 */
  drivers: DriverTimingData[];
}

/**
 * 세션 정보 메시지
 */
export interface SessionInfoMessage {
  /** 메시지 타입 */
  type: 'SESSION_INFO';
  
  /** 타임스탬프 (ISO 문자열) */
  timestamp: string;
  
  /** 세션 정보 */
  session: {
    id: number;
    name: string;
    type: string;
    date: string;
    duration?: number;
    status?: string;
    maxSessionTime?: number; // 세션의 최대 시간 (초)
  };
  
  /** 이벤트 정보 */
  event: {
    id: number;
    name: string;
    round: number;
  };
  
  /** 서킷 정보 */
  circuit: {
    id: number;
    name: string;
    shortName?: string;
    length?: number;
  };
}

/**
 * 에러 메시지
 */
export interface ErrorMessage {
  /** 메시지 타입 */
  type: 'ERROR';
  
  /** 타임스탬프 (ISO 문자열) */
  timestamp: string;
  
  /** 에러 코드 */
  code: string;
  
  /** 에러 메시지 */
  message: string;
  
  /** 에러 상세 정보 */
  details?: Record<string, unknown>;
}

/**
 * 연결 상태 메시지
 */
export interface ConnectionStatusMessage {
  /** 메시지 타입 */
  type: 'CONNECTION_STATUS';
  
  /** 타임스탬프 (ISO 문자열) */
  timestamp: string;
  
  /** 연결 상태 */
  status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
  
  /** 연결된 클라이언트 수 */
  clientCount?: number;
  
  /** 메시지 */
  message?: string;
}

/**
 * 모든 WebSocket 메시지 타입의 합집합
 */
export type WebSocketMessage = 
  | ReplayControlMessage 
  | TimingUpdateMessage 
  | SessionInfoMessage 
  | ErrorMessage 
  | ConnectionStatusMessage;
