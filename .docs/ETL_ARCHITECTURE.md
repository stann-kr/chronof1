# ChronoF1 ETL 아키텍처 및 데이터 적재 프로세스

## 📋 프로젝트 개요

ChronoF1은 Historic Formula 1 결과 조회와 2018 시즌 이후 Live-Timing Replay를 제공하는 React SPA + NestJS API 모노레포 프로젝트입니다. 본 문서는 FastF1 라이브러리를 활용한 F1 데이터의 ETL(Extract, Transform, Load) 프로세스와 아키텍처를 상세히 다룹니다.

## 전체 아키텍처

### 기술 스택
- **프론트엔드**: React 18, TypeScript, Vite, Zustand, React Router v6
- **백엔드**: NestJS 10, WebSocket Gateway, Prisma ORM
- **데이터베이스**: PostgreSQL 15 + Timescale, Redis 7
- **ETL**: Python3 scripts (FastF1 Library)
- **빌드 도구**: pnpm workspaces + Turborepo

### 데이터 소스
- **FastF1**: F1 라이브 타이밍 데이터 (2018년 이후)
- **Jolpica API**: 히스토릭 F1 데이터
- **OpenF1**: 추가적인 실시간 데이터

## ETL 프로세스 아키텍처

### 1. 데이터 추출 (Extract)

```python
# FastF1을 통한 세션 데이터 로드
session = fastf1.get_session(year, round_number, session_type)
session.load()
```

**주요 데이터 소스:**
- **Lap Data**: 각 드라이버의 랩 타임, 섹터 타임
- **Car Data**: RPM, Speed, nGear, Throttle, Brake, DRS
- **Position Data**: X, Y, Z 좌표, Status
- **Weather Data**: 트랙 온도, 기압, 습도
- **Race Control Messages**: 안전 플래그, 페널티 정보
- **Pit Stop Data**: 피트스톱 시간, 타이어 교체 정보
- **Tyre Stint Data**: 타이어 컴파운드, 사용 기간

### 2. 데이터 변환 (Transform)

#### 텔레메트리 데이터 분리 아키텍처

ETL 프로세스의 핵심 개선사항으로, 텔레메트리 데이터와 위치 데이터를 완전히 분리하여 처리합니다:

```python
def fetch_telemetry_data(lap):
    """차량 성능 메트릭 데이터 추출"""
    telemetry = lap.get_car_data()
    return telemetry.add_distance()[['Time', 'RPM', 'Speed', 'nGear', 'Throttle', 'Brake', 'DRS', 'Distance']]

def fetch_position_data(lap):
    """공간 좌표 데이터 추출"""
    position = lap.get_pos_data()
    return position[['Time', 'Status', 'X', 'Y', 'Z']]
```

**분리의 이점:**
- **성능 최적화**: 각각의 데이터 특성에 맞는 인덱싱 및 쿼리 최적화
- **저장 효율성**: 서로 다른 압축 알고리즘 적용 가능
- **확장성**: 각 데이터 타입별 독립적인 스케일링
- **데이터 무결성**: 용도별 검증 로직 적용

#### 데이터 정제 과정

```python
def clean_and_validate_telemetry_data(telemetry_data):
    """텔레메트리 데이터 정제 및 검증"""
    # NaN 값 처리
    telemetry_data = telemetry_data.dropna()
    
    # 데이터 타입 변환
    telemetry_data['RPM'] = pd.to_numeric(telemetry_data['RPM'], errors='coerce')
    telemetry_data['Speed'] = pd.to_numeric(telemetry_data['Speed'], errors='coerce')
    
    # 이상값 필터링
    telemetry_data = telemetry_data[
        (telemetry_data['Speed'] >= 0) & 
        (telemetry_data['Speed'] <= 400)
    ]
    
    return telemetry_data
```

### 3. 데이터 적재 (Load)

#### 데이터베이스 스키마

**핵심 테이블 구조:**

```sql
-- 라이브 텔레메트리 데이터 (차량 성능)
Table: LiveTelemetryData
- id: SERIAL PRIMARY KEY
- driver_session_id: INTEGER
- session_time: TIMESTAMP
- rpm: INTEGER
- speed: DECIMAL
- n_gear: INTEGER
- throttle: DECIMAL
- brake: BOOLEAN
- drs: INTEGER
- distance: DECIMAL

-- 라이브 위치 데이터 (공간 좌표)
Table: LivePositionData
- id: SERIAL PRIMARY KEY
- driver_session_id: INTEGER
- session_time: TIMESTAMP
- status: VARCHAR
- x: DECIMAL
- y: DECIMAL
- z: DECIMAL
```

#### 배치 삽입 최적화

```python
def bulk_insert_telemetry_data(connection, telemetry_records):
    """배치 삽입을 통한 성능 최적화"""
    query = """
    INSERT INTO "LiveTelemetryData" 
    (driver_session_id, session_time, rpm, speed, n_gear, throttle, brake, drs, distance)
    VALUES %s
    """
    execute_values(
        connection.cursor(),
        query,
        telemetry_records,
        template=None,
        page_size=1000
    )
```

## 실제 적재 성과

### 2025년 1-2라운드 ETL 결과

#### Round 1 (Australian Grand Prix)
- **처리 시간**: 2분 50초
- **총 랩**: 927개
- **텔레메트리 포인트**: ~340,000개
- **위치 데이터 포인트**: ~345,000개
- **추가 데이터**: 피트스톱 84개, 타이어 스틴트 51개, 날씨 178개, 메시지 113개

#### Round 2 (Chinese Grand Prix)
- **처리 시간**: 3분 5초
- **총 랩**: 1,120개 (20 드라이버 × 56랩)
- **텔레메트리 포인트**: ~410,000개
- **위치 데이터 포인트**: ~415,000개
- **추가 데이터**: 피트스톱 26개, 타이어 스틴트 41개, 날씨 154개, 메시지 56개

## ETL 실행 방법

### 기본 실행
```bash
cd apps/api/src/ingest/python
python chronof1_etl.py [year] [round] [--telemetry]
```

### 예시 명령어
```bash
# 2025년 1라운드 기본 데이터 적재
python chronof1_etl.py 2025 1

# 2025년 2라운드 텔레메트리 포함 전체 적재
python chronof1_etl.py 2025 2 --telemetry
```

### 환경 설정

**.env 파일 설정:**
```env
# PostgreSQL 연결 정보
DB_HOST=nas.stann.kr
DB_PORT=7000
DB_NAME=chrono-f1
DB_USER=your_username
DB_PASSWORD=your_password
```

**Python 의존성:**
```bash
pip install -r requirements.txt
```

## 주요 ETL 함수 및 로직

### 1. 세션 데이터 처리
```python
def process_session_data(year, round_num, session_key):
    """세션 기본 정보 처리"""
    # 1. FastF1 세션 로드
    session = fastf1.get_session(year, round_num, 'R')
    session.load()
    
    # 2. 기본 메타데이터 추출
    event_info = session.event
    session_info = session.session_info
    
    # 3. 데이터베이스 저장
    return save_session_metadata(event_info, session_info)
```

### 2. 드라이버별 랩 데이터 처리
```python
def process_driver_laps(session, driver_number):
    """드라이버별 상세 랩 데이터 처리"""
    driver_laps = session.laps.pick_driver(driver_number)
    
    for lap_number, lap in driver_laps.iterrows():
        # 기본 랩 정보 저장
        lap_id = save_lap_data(lap)
        
        if telemetry_enabled:
            # 텔레메트리 데이터 처리
            telemetry_data = fetch_telemetry_data(lap)
            save_telemetry_data(lap_id, telemetry_data)
            
            # 위치 데이터 처리
            position_data = fetch_position_data(lap)
            save_position_data(lap_id, position_data)
```

### 3. 데이터 검증 및 품질 관리
```python
def validate_data_quality(session_id):
    """적재된 데이터의 품질 검증"""
    validation_results = {
        'laps_count': get_laps_count(session_id),
        'telemetry_coverage': calculate_telemetry_coverage(session_id),
        'position_coverage': calculate_position_coverage(session_id),
        'data_completeness': check_data_completeness(session_id)
    }
    
    return validation_results
```

## 성능 최적화 전략

### 1. 데이터베이스 최적화
- **인덱싱**: 시간 기반 쿼리를 위한 복합 인덱스
- **파티셔닝**: 세션별 테이블 파티셔닝
- **연결 풀링**: PostgreSQL 연결 풀 최적화

### 2. 메모리 관리
- **청크 단위 처리**: 대용량 데이터를 청크로 분할 처리
- **가비지 컬렉션**: 메모리 사용량 모니터링 및 최적화

### 3. 병렬 처리
- **드라이버별 병렬 처리**: 멀티프로세싱을 통한 성능 향상
- **비동기 I/O**: 데이터베이스 쓰기 작업 비동기화

## 모니터링 및 로깅

### 로그 레벨 구성
```python
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
```

### 주요 메트릭
- **처리 시간**: 각 단계별 소요 시간 추적
- **데이터 볼륨**: 적재된 레코드 수 통계
- **오류율**: 실패한 작업의 비율 모니터링
- **리소스 사용량**: CPU, 메모리, 네트워크 사용량

## 🚨 에러 처리 및 복구

### 주요 에러 시나리오
1. **네트워크 연결 오류**: 외부 API 접근 실패
2. **데이터베이스 연결 오류**: PostgreSQL 연결 문제
3. **데이터 검증 실패**: 불완전하거나 손상된 데이터
4. **메모리 부족**: 대용량 데이터 처리 시 리소스 부족

### 복구 전략
```python
def robust_etl_execution(year, round_num):
    """견고한 ETL 실행을 위한 오류 처리"""
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            execute_etl_process(year, round_num)
            break
        except Exception as e:
            logger.error(f"ETL 실행 실패 (시도 {retry_count + 1}): {e}")
            retry_count += 1
            time.sleep(30)  # 30초 대기 후 재시도
```

## 향후 개발 계획

### 1. 실시간 데이터 처리
- **스트리밍 ETL**: Kafka를 활용한 실시간 데이터 파이프라인
- **WebSocket 통합**: 라이브 타이밍 데이터 실시간 전송

### 2. 데이터 분석 기능
- **성능 분석**: 드라이버 및 팀 성능 비교 분석
- **예측 모델**: 머신러닝을 활용한 레이스 결과 예측

### 3. 인프라 개선
- **컨테이너화**: Docker를 활용한 ETL 환경 표준화
- **클라우드 마이그레이션**: AWS/GCP 기반 확장 가능한 인프라

## 참고 자료

- [FastF1 공식 문서](https://theoehrly.github.io/Fast-F1/)
- [Jolpica F1 DB 스키마](https://dbdocs.io/jolpica/jolpica-f1)
- [OpenF1 API 문서](https://openf1.org/#api-endpoints)
- [PostgreSQL 성능 튜닝 가이드](https://www.postgresql.org/docs/current/performance-tips.html)

---

**작성자**: Stann
**최종 업데이트**: 2025년 7월 31일  
**버전**: 1.0.0
