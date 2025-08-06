# ChronoF1 ETL Pipeline

ChronoF1 ETL 파이프라인은 FastF1 라이브러리를 사용하여 Formula 1 데이터를 PostgreSQL 데이터베이스에 적재하는 시스템입니다.

## 📁 프로젝트 구조

```
python/
├── main.py                 # 메인 ETL 스크립트
├── core/                   # 핵심 ETL 모듈
│   ├── __init__.py
│   ├── config.py          # 설정 관리
│   ├── database.py        # 데이터베이스 연결 관리
│   └── etl_processor.py   # ETL 프로세싱 로직
├── utils/                  # 유틸리티 모듈
│   ├── __init__.py
│   └── logger.py          # 로깅 유틸리티
├── f1_api.py              # FastF1 API 래퍼
├── repositories.py        # 데이터베이스 저장소
├── db.py                  # 데이터베이스 연결
├── circuit_data.py        # 서킷 정보
├── tests/                 # 테스트 파일들
├── legacy/                # 레거시 코드
└── requirements.txt       # Python 의존성
```

## 🚀 사용법

### 기본 사용법

```bash
# 2024 시즌 전체 적재
python main.py 2024

# 2024 시즌 5라운드만 적재
python main.py 2024 5

# 2024 시즌 1-5라운드 범위 적재
python main.py 2024 1-5

# 2024 시즌 특정 라운드들 적재 (3, 5, 7라운드)
python main.py 2024 3,5,7

# 2024 시즌 혼합 라운드 적재 (1라운드, 3-5라운드, 8라운드)
python main.py 2024 1,3-5,8

# 2024 시즌 다중 범위 적재 (1-3라운드, 7-9라운드)
python main.py 2024 1-3,7-9

# 시즌 범위 적재 (2022-2024)
python main.py 2022-2024

# 텔레메트리 데이터 포함
python main.py 2024 --telemetry

# 기존 데이터 덮어쓰기
python main.py 2024 --force

# 디버그 모드
python main.py 2024 --log-level DEBUG
```

### 명령행 옵션

- `season`: 시즌 연도 (예: 2024) 또는 시즌 범위 (예: 2022-2024)
- `round`: 라운드 지정 방식:
  - 단일 라운드: `5`
  - 라운드 범위: `1-5`
  - 개별 라운드: `3,5,7`
  - 혼합 형식: `1,3-5,8` (1라운드 + 3-5라운드 + 8라운드)
  - 다중 범위: `1-3,7-9` (1-3라운드 + 7-9라운드)
  - 생략 시 전체 시즌
- `--telemetry`: 텔레메트리 데이터도 함께 적재
- `--force`: 기존 데이터가 있어도 덮어쓰기
- `--log-level`: 로그 레벨 (DEBUG, INFO, WARNING, ERROR)

## 🏗️ 아키텍처

### 파일 역할 분석

#### 핵심 모듈
- **`main.py`**: ETL 파이프라인의 메인 진입점, 명령행 인터페이스 제공
- **`db.py`**: 저수준 PostgreSQL 연결 관리 (Connection Pool, 트랜잭션)
- **`f1_api.py`**: FastF1 라이브러리 래퍼, F1 데이터 추출
- **`repositories.py`**: 데이터베이스 저장소 패턴, 비즈니스 로직
- **`circuit_data.py`**: 서킷 정보 정적 데이터

#### Core 모듈 (고수준 추상화)
- **`core/config.py`**: 전역 설정 관리 (환경변수, 캐시, 배치크기 등)
- **`core/database.py`**: 데이터베이스 관리자 (Repository 패턴 조합)
- **`core/etl_processor.py`**: ETL 프로세싱 오케스트레이션

#### Utils 모듈
- **`utils/logger.py`**: 구조화된 로깅 유틸리티

#### 폴더별 역할
- **`tests/`**: 모든 테스트 파일 (브레이크 데이터, DB 연결 등)
- **`legacy/`**: 이전 ETL 스크립트 (참고용)

### 데이터 흐름

```
FastF1 API → f1_api.py → ETL Processor → Repositories → PostgreSQL
     ↑           ↑           ↑              ↑            ↑
  캐시관리    API래핑    비즈니스로직    데이터매핑    영속화
```

## 📊 데이터 플로우

1. **메타데이터 처리**
   - 시즌 정보 (CommonSeason)
   - 서킷 정보 (CommonCircuit)
   - 이벤트 정보 (CommonEvent)
   - 세션 정보 (CommonSession)

2. **드라이버/팀 데이터**
   - 드라이버 정보 (CommonDriver)
   - 팀 정보 (CommonTeam)
   - 시즌별 팀-드라이버 관계 (CommonSeasonTeamDriver)

3. **라이브 데이터**
   - 드라이버 세션 (LiveDriverSession)
   - 랩 데이터 (LiveLap)
   - 텔레메트리 데이터 (LiveTelemetryData) - 선택사항
   - 피트스톱 (LivePitStop)
   - 타이어 스틴트 (LiveTyreStint)

## ⚙️ 설정

### 환경 변수

```bash
# 필수
DATABASE_URL=postgresql://user:password@host:port/database

# 선택사항
FASTF1_CACHE_PATH=/path/to/cache  # 기본값: 프로젝트 루트의 cache 폴더
ETL_LOG_LEVEL=INFO                # 기본값: INFO
ETL_BATCH_SIZE=1000              # 기본값: 1000
ETL_ENABLE_CACHE=true            # 기본값: true
```

### 의존성 설치

```bash
pip install -r requirements.txt
```

## 🔧 핵심 기능

### 브레이크 데이터 처리

- FastF1에서 제공하는 브레이크 데이터는 Boolean 타입으로 처리됩니다
- `True`: 브레이크가 눌린 상태
- `False`: 브레이크가 눌리지 않은 상태
- `safe_bool()` 함수를 통해 안전한 타입 변환을 수행합니다

### 캐시 관리

- FastF1 캐시를 통해 반복 요청 시 성능을 최적화합니다
- 캐시 경로는 `ETL_ENABLE_CACHE` 환경 변수로 제어할 수 있습니다

### 배치 처리

- 대량 데이터는 배치 단위로 삽입하여 성능을 최적화합니다
- 배치 크기는 `ETL_BATCH_SIZE` 환경 변수로 조정할 수 있습니다

## 🧪 테스트

테스트 파일들은 `tests/` 폴더에 있습니다:

```bash
# 브레이크 데이터 테스트
python tests/test_brake_data.py

# PostgreSQL Boolean 저장 테스트
python tests/test_postgresql_boolean.py

# 데이터베이스 브레이크 값 확인
python tests/check_brake_in_db.py
```

## 📝 로깅

- 구조화된 로깅을 통해 ETL 프로세스를 추적할 수 있습니다
- 로그 레벨: DEBUG, INFO, WARNING, ERROR
- 각 드라이버, 세션별로 상세한 처리 로그를 제공합니다

## 🔍 문제 해결

### 일반적인 문제들

1. **데이터베이스 연결 실패**
   ```
   DATABASE_URL 환경 변수가 올바르게 설정되어 있는지 확인하세요.
   ```

2. **FastF1 캐시 오류**
   ```
   캐시 폴더의 권한을 확인하거나 ETL_ENABLE_CACHE=false로 설정하세요.
   ```

3. **브레이크 값이 NULL**
   ```
   데이터베이스 스키마의 brake 컬럼이 Boolean 타입인지 확인하세요.
   ```

4. **메모리 부족**
   ```
   ETL_BATCH_SIZE를 더 작은 값으로 설정하거나 텔레메트리 없이 실행하세요.
   ```

## 📈 성능 최적화

- **텔레메트리 제외**: `--telemetry` 플래그 없이 실행하면 처리 속도가 크게 향상됩니다
- **배치 크기 조정**: `ETL_BATCH_SIZE`를 시스템 메모리에 맞게 조정하세요
- **캐시 활용**: FastF1 캐시를 활성화하여 반복 실행 시 속도를 높이세요

## 🔗 관련 문서

- [FastF1 Documentation](https://theoehrly.github.io/Fast-F1/)
- [ChronoF1 Database Schema](../prisma/schema.prisma)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
