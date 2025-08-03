"""
ChronoF1 데이터베이스 저장소 모듈

FastF1 데이터를 ChronoF1 PostgreSQL 스키마에 매핑하고 저장하는 저장소 클래스들을 정의합니다.

이 모듈은 두 가지 주요 저장소 클래스를 제공합니다:
- CommonRepository: 메타데이터 (시즌, 서킷, 드라이버, 팀 등)
- LiveRepository: 라이브 데이터 (랩, 텔레메트리, 피트스톱 등)

Note:
    - 모든 upsert 메서드는 기존 데이터가 있으면 업데이트하고, 없으면 새로 생성합니다.
    - 브레이크 값은 safe_bool 함수를 통해 Boolean 타입으로 안전하게 변환됩니다.
    - 배치 삽입을 통해 대량 데이터 처리 성능을 최적화합니다.
"""

import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any

from db import PgDb

log = logging.getLogger(__name__)

class CommonRepository:
    """공통(Common) 도메인 테이블 저장소.
    
    시즌, 서킷, 이벤트, 세션, 드라이버, 팀 등의 데이터를 저장합니다.
    """
    
    def __init__(self, db: PgDb):
        """CommonRepository 인스턴스를 초기화합니다.
        
        Args:
            db: 데이터베이스 연결 객체
        """
        self.db = db
    
    def upsert_season(self, year: int, name: Optional[str] = None, 
                     start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> int:
        """시즌 정보를 저장하거나 업데이트합니다.
        
        Args:
            year: 시즌 연도
            name: 시즌 공식 명칭 (기본값: "FIA Formula One World Championship {year}")
            start_date: 시즌 시작일
            end_date: 시즌 종료일
            
        Returns:
            시즌 ID
        """
        if not name:
            name = f"FIA Formula One World Championship {year}"
        
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            'SELECT id FROM "common_seasons" WHERE year = %s',
            year
        )
        
        if existing:
            # 업데이트 (기존 값이 없는 경우에만 업데이트)
            self.db.execute(
                '''
                UPDATE "common_seasons" 
                SET 
                    name = %s,
                    start_date = COALESCE(%s, start_date),
                    end_date = COALESCE(%s, end_date)
                WHERE id = %s
                ''',
                name, start_date, end_date, existing[0]
            )
            season_id = existing[0]
            log.info(f"시즌 {year} 업데이트됨 (ID: {season_id})")
        else:
            # 새로 삽입
            season_id = self.db.fetch_one(
                '''
                INSERT INTO "common_seasons" 
                (year, name, start_date, end_date) 
                VALUES (%s, %s, %s, %s) 
                RETURNING id
                ''',
                year, name, start_date, end_date
            )[0]
            log.info(f"시즌 {year} 생성됨 (ID: {season_id})")
        
        return season_id
    
    def upsert_circuit(self, name: str, short_name: Optional[str] = None, 
                      locality: Optional[str] = None, country: Optional[str] = None,
                      latitude: Optional[float] = None, longitude: Optional[float] = None,
                      length: Optional[float] = None, turns: Optional[int] = None) -> int:
        """서킷 정보를 저장하거나 업데이트합니다.
        
        Args:
            name: 서킷 이름
            short_name: 짧은 이름
            locality: 지역명
            country: 국가
            latitude: 위도
            longitude: 경도
            length: 트랙 길이 (km)
            turns: 코너 수
            
        Returns:
            서킷 ID
        """
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            'SELECT id FROM "common_circuits" WHERE name = %s',
            name
        )
        
        if existing:
            # 업데이트 (기존 값이 있으면 유지, 없으면 새 값으로 업데이트)
            self.db.execute(
                '''
                UPDATE "common_circuits" 
                SET 
                    short_name = COALESCE(%s, short_name),
                    locality = COALESCE(%s, locality),
                    country = COALESCE(%s, country),
                    latitude = COALESCE(%s, latitude),
                    longitude = COALESCE(%s, longitude),
                    length = COALESCE(%s, length),
                    turns = COALESCE(%s, turns)
                WHERE id = %s
                ''',
                short_name, locality, country, latitude, longitude, length, turns, existing[0]
            )
            circuit_id = existing[0]
            log.info(f"서킷 '{name}' 업데이트됨 (ID: {circuit_id})")
        else:
            # 새로 삽입
            circuit_id = self.db.fetch_one(
                '''
                INSERT INTO "common_circuits" 
                (name, short_name, locality, country, latitude, longitude, length, turns) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) 
                RETURNING id
                ''',
                name, short_name, locality, country, latitude, longitude, length, turns
            )[0]
            log.info(f"서킷 '{name}' 생성됨 (ID: {circuit_id})")
        
        return circuit_id
    
    def upsert_event(self, season_id: int, circuit_id: int, round_num: int, 
                    name: str, short_name: Optional[str], event_start: datetime, event_end: datetime,
                    status: str = "completed") -> int:
        """이벤트(그랑프리) 정보를 저장하거나 업데이트합니다.
        
        Args:
            season_id: 시즌 ID
            circuit_id: 서킷 ID
            round_num: 라운드 번호
            name: 이벤트 이름
            event_start: 이벤트 시작 날짜
            event_end: 이벤트 종료 날짜
            status: 이벤트 상태
            
        Returns:
            이벤트 ID
        """
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            'SELECT id FROM "common_events" WHERE season_id = %s AND round = %s',
            season_id, round_num
        )
        
        if existing:
            # 업데이트
            self.db.execute(
                '''
                UPDATE "common_events" 
                SET 
                    name = %s,
                    circuit_id = %s,
                    event_start = %s,
                    event_end = %s,
                    status = %s
                WHERE id = %s
                ''',
                name, circuit_id, event_start, event_end, status, existing[0]
            )
            event_id = existing[0]
            log.info(f"이벤트 {season_id}-R{round_num} '{name}' 업데이트됨 (ID: {event_id})")
        else:
            # 새로 삽입
            event_id = self.db.fetch_one(
                '''
                INSERT INTO "common_events" 
                (season_id, circuit_id, round, name, event_start, event_end, status) 
                VALUES (%s, %s, %s, %s, %s, %s, %s) 
                RETURNING id
                ''',
                season_id, circuit_id, round_num, name, event_start, event_end, status
            )[0]
            log.info(f"이벤트 {season_id}-R{round_num} '{name}' 생성됨 (ID: {event_id})")
        
        return event_id
    
    def upsert_session(self, event_id: int, session_type: str, 
                      name: str, date: datetime, duration: Optional[float] = None,
                      status: str = "completed", results_fetched: bool = False) -> int:
        """세션 정보를 저장하거나 업데이트합니다.
        
        Args:
            event_id: 이벤트 ID
            session_type: 세션 유형 (FP1, FP2, FP3, Q, SQ, S, R 등)
            name: 세션 이름
            date: 세션 날짜 및 시간
            duration: 세션 지속 시간(분)
            status: 세션 상태
            results_fetched: 데이터 적재 완료 여부
            
        Returns:
            세션 ID
        """
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            'SELECT id FROM "common_sessions" WHERE event_id = %s AND type = %s',
            event_id, session_type
        )
        
        if existing:
            # 업데이트
            self.db.execute(
                '''
                UPDATE "common_sessions" 
                SET 
                    name = %s,
                    date = %s,
                    duration = COALESCE(%s, duration),
                    status = %s,
                    results_fetched = %s
                WHERE id = %s
                ''',
                name, date, duration, status, results_fetched, existing[0]
            )
            session_id = existing[0]
            log.info(f"세션 {event_id}-{session_type} '{name}' 업데이트됨 (ID: {session_id})")
        else:
            # 새로 삽입
            session_id = self.db.fetch_one(
                '''
                INSERT INTO "common_sessions" 
                (event_id, type, name, date, duration, status, results_fetched) 
                VALUES (%s, %s, %s, %s, %s, %s, %s) 
                RETURNING id
                ''',
                event_id, session_type, name, date, duration, status, results_fetched
            )[0]
            log.info(f"세션 {event_id}-{session_type} '{name}' 생성됨 (ID: {session_id})")
        
        return session_id

    def get_session_results_fetched_status(self, event_id: int, session_type: str) -> Optional[bool]:
        """특정 세션의 results_fetched 상태를 조회합니다.
        
        Args:
            event_id: 이벤트 ID
            session_type: 세션 유형 (FP1, FP2, FP3, Q, SQ, S, R 등)
            
        Returns:
            results_fetched 상태 (True/False) 또는 None (세션이 없는 경우)
        """
        result = self.db.fetch_one(
            'SELECT results_fetched FROM "common_sessions" WHERE event_id = %s AND type = %s',
            event_id, session_type
        )
        return result[0] if result else None

    def update_session_results_fetched_status(self, session_id: int, status: bool) -> None:
        """특정 세션의 results_fetched 상태를 업데이트합니다.
        
        Args:
            session_id: 세션 ID
            status: 업데이트할 상태 (True/False)
        """
        self.db.execute(
            'UPDATE "common_sessions" SET results_fetched = %s WHERE id = %s',
            status, session_id
        )
        log.info(f"세션 {session_id}의 results_fetched 상태가 {status}로 업데이트됨")
    
    def upsert_driver(self, code: str, number: Optional[int] = None,
                     full_name: Optional[str] = None,
                     dob: Optional[datetime] = None, nationality: Optional[str] = None) -> int:
        """드라이버 정보를 저장하거나 업데이트합니다.
        
        Args:
            code: 드라이버 코드 (3글자)
            number: 드라이버 번호
            first_name: 이름
            last_name: 성
            full_name: 전체 이름
            
        Returns:
            드라이버 ID
        """
        # 전체 이름이 제공되지 않으면 이름과 성으로 생성
        if not full_name:
            full_name = code
        
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            'SELECT id FROM "common_drivers" WHERE code = %s',
            code
        )
        
        if existing:
            # 업데이트 (기존 값이 없거나 빈 문자열인 경우에만 업데이트)
            self.db.execute(
                '''
                UPDATE "common_drivers" 
                SET 
                    number = COALESCE(%s, number),
                    full_name = COALESCE(%s, full_name),
                    dob = COALESCE(%s, dob),
                    nationality = COALESCE(%s, nationality)
                WHERE id = %s
                ''',
                number, full_name, dob, nationality, existing[0]
            )
            driver_id = existing[0]
            log.info(f"드라이버 '{code}' 업데이트됨 (ID: {driver_id})")
        else:
            # 새로 삽입
            driver_id = self.db.fetch_one(
                '''
                INSERT INTO "common_drivers" 
                (code, number, full_name, dob, nationality) 
                VALUES (%s, %s, %s, %s, %s) 
                RETURNING id
                ''',
                code, number, full_name, dob, nationality
            )[0]
            log.info(f"드라이버 '{code}' 생성됨 (ID: {driver_id})")
        
        return driver_id
    
    def upsert_team(self, name: str, short_name: Optional[str] = None,
                   nationality: Optional[str] = None, color: Optional[str] = None) -> int:
        """팀 정보를 저장하거나 업데이트합니다.
        
        Args:
            name: 팀 이름
            short_name: 짧은 팀 이름
            nationality: 국적
            color: 팀 색상 코드
            
        Returns:
            팀 ID
        """
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            'SELECT id FROM "common_teams" WHERE name = %s',
            name
        )
        
        if existing:
            # 업데이트 (기존 값이 있으면 유지)
            self.db.execute(
                '''
                UPDATE "common_teams" 
                SET 
                    short_name = COALESCE(%s, short_name),
                    nationality = COALESCE(%s, nationality),
                    color = COALESCE(%s, color)
                WHERE id = %s
                ''',
                short_name, nationality, color, existing[0]
            )
            team_id = existing[0]
            log.info(f"팀 '{name}' 업데이트됨 (ID: {team_id})")
        else:
            # 새로 삽입
            team_id = self.db.fetch_one(
                '''
                INSERT INTO "common_teams" 
                (name, short_name, nationality, color) 
                VALUES (%s, %s, %s, %s) 
                RETURNING id
                ''',
                name, short_name, nationality, color
            )[0]
            log.info(f"팀 '{name}' 생성됨 (ID: {team_id})")
        
        return team_id
    
    def upsert_season_team_driver(self, season_id: int, team_id: int, driver_id: int,
                                 driver_number: Optional[int] = None, is_primary: bool = True,
                                 from_round: Optional[int] = None, to_round: Optional[int] = None) -> int:
        """시즌-팀-드라이버 관계를 저장하거나 업데이트합니다.
        
        Args:
            season_id: 시즌 ID
            team_id: 팀 ID
            driver_id: 드라이버 ID
            driver_number: 해당 시즌의 드라이버 번호
            is_primary: 주 드라이버 여부
            from_round: 시작 라운드
            to_round: 종료 라운드
            
        Returns:
            관계 ID
        """
        # from_round가 None이면 0으로 대체 (UNIQUE 제약조건 때문)
        from_round_val = from_round if from_round is not None else 0
        
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            '''
            SELECT id FROM "common_season_team_drivers" 
            WHERE season_id = %s AND team_id = %s AND driver_id = %s AND 
                  (from_round = %s OR (from_round IS NULL AND %s = 0))
            ''',
            season_id, team_id, driver_id, from_round_val, from_round_val
        )
        
        if existing:
            # 업데이트
            self.db.execute(
                '''
                UPDATE "common_season_team_drivers" 
                SET 
                    driver_number = COALESCE(%s, driver_number),
                    is_primary = %s,
                    to_round = COALESCE(%s, to_round)
                WHERE id = %s
                ''',
                driver_number, is_primary, to_round, existing[0]
            )
            relation_id = existing[0]
            log.info(f"시즌-팀-드라이버 관계 {season_id}-{team_id}-{driver_id} 업데이트됨 (ID: {relation_id})")
        else:
            # 새로 삽입
            relation_id = self.db.fetch_one(
                '''
                INSERT INTO "common_season_team_drivers" 
                (season_id, team_id, driver_id, driver_number, is_primary, from_round, to_round) 
                VALUES (%s, %s, %s, %s, %s, %s, %s) 
                RETURNING id
                ''',
                season_id, team_id, driver_id, driver_number, is_primary, from_round, to_round
            )[0]
            log.info(f"시즌-팀-드라이버 관계 {season_id}-{team_id}-{driver_id} 생성됨 (ID: {relation_id})")
        
        return relation_id


class LiveRepository:
    """라이브(Live) 도메인 테이블 저장소.
    
    라이브 이벤트, 세션, 드라이버 세션, 랩, 텔레메트리 등의 데이터를 저장합니다.
    """
    
    def __init__(self, db: PgDb):
        """LiveRepository 인스턴스를 초기화합니다.
        
        Args:
            db: 데이터베이스 연결 객체
        """
        self.db = db
    
    def upsert_live_event(self, common_event_id: int, season_id: int, circuit_id: int) -> int:
        """라이브 이벤트를 저장하거나 업데이트합니다.
        
        Args:
            common_event_id: 공통 이벤트 ID
            season_id: 시즌 ID
            circuit_id: 서킷 ID
            
        Returns:
            라이브 이벤트 ID
        """
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            'SELECT id FROM "live_events" WHERE common_event_id = %s',
            common_event_id
        )
        
        if existing:
            # 업데이트
            self.db.execute(
                '''
                UPDATE "live_events" 
                SET 
                    season_id = %s,
                    circuit_id = %s
                WHERE id = %s
                ''',
                season_id, circuit_id, existing[0]
            )
            live_event_id = existing[0]
            log.info(f"라이브 이벤트 {common_event_id} 업데이트됨 (ID: {live_event_id})")
        else:
            # 새로 삽입
            live_event_id = self.db.fetch_one(
                '''
                INSERT INTO "live_events" 
                (common_event_id, season_id, circuit_id) 
                VALUES (%s, %s, %s) 
                RETURNING id
                ''',
                common_event_id, season_id, circuit_id
            )[0]
            log.info(f"라이브 이벤트 {common_event_id} 생성됨 (ID: {live_event_id})")
        
        return live_event_id
    
    def upsert_live_session(self, live_event_id: int, common_session_id: int, common_event_id: int) -> int:
        """라이브 세션을 저장하거나 업데이트합니다.
        
        Args:
            live_event_id: 라이브 이벤트 ID
            common_session_id: 공통 세션 ID
            common_event_id: 공통 이벤트 ID
            
        Returns:
            라이브 세션 ID
        """
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            'SELECT id FROM "live_sessions" WHERE common_session_id = %s',
            common_session_id
        )
        
        if existing:
            # 업데이트
            self.db.execute(
                '''
                UPDATE "live_sessions" 
                SET 
                    live_event_id = %s,
                    common_event_id = %s
                WHERE id = %s
                ''',
                live_event_id, common_event_id, existing[0]
            )
            live_session_id = existing[0]
            log.info(f"라이브 세션 {common_session_id} 업데이트됨 (ID: {live_session_id})")
        else:
            # 새로 삽입
            live_session_id = self.db.fetch_one(
                '''
                INSERT INTO "live_sessions" 
                (live_event_id, common_session_id, common_event_id) 
                VALUES (%s, %s, %s) 
                RETURNING id
                ''',
                live_event_id, common_session_id, common_event_id
            )[0]
            log.info(f"라이브 세션 {common_session_id} 생성됨 (ID: {live_session_id})")
        
        return live_session_id
    
    def upsert_driver_session(self, session_id: int, driver_id: int, team_id: int,
                             car_number: int, position: Optional[int] = None,
                             grid_position: Optional[int] = None, status: Optional[str] = None,
                             points: float = 0.0) -> int:
        """드라이버 세션을 저장하거나 업데이트합니다.
        
        Args:
            session_id: 라이브 세션 ID
            driver_id: 드라이버 ID
            team_id: 팀 ID
            car_number: 차량 번호
            position: 최종 포지션
            grid_position: 그리드 포지션
            status: 상태 (완주, DNF 등)
            points: 획득 포인트
            
        Returns:
            드라이버 세션 ID
        """
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            'SELECT id FROM "live_driver_sessions" WHERE session_id = %s AND driver_id = %s',
            session_id, driver_id
        )
        
        if existing:
            # 업데이트
            self.db.execute(
                '''
                UPDATE "live_driver_sessions" 
                SET 
                    team_id = %s,
                    car_number = %s,
                    position = COALESCE(%s, position),
                    grid_position = COALESCE(%s, grid_position),
                    status = COALESCE(%s, status),
                    points = %s
                WHERE id = %s
                ''',
                team_id, car_number, position, grid_position, status, points, existing[0]
            )
            driver_session_id = existing[0]
            log.info(f"드라이버 세션 {session_id}-{driver_id} 업데이트됨 (ID: {driver_session_id})")
        else:
            # 새로 삽입
            driver_session_id = self.db.fetch_one(
                '''
                INSERT INTO "live_driver_sessions" 
                (session_id, driver_id, team_id, car_number, position, grid_position, status, points) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) 
                RETURNING id
                ''',
                session_id, driver_id, team_id, car_number, position, grid_position, status, points
            )[0]
            log.info(f"드라이버 세션 {session_id}-{driver_id} 생성됨 (ID: {driver_session_id})")
        
        return driver_session_id
    
    def upsert_lap(self, driver_session_id: int, lap_number: int, 
                  lap_time: Optional[float] = None, lap_time_string: Optional[str] = None,
                  sector1_time: Optional[float] = None, sector2_time: Optional[float] = None,
                  sector3_time: Optional[float] = None, is_personal_best: Optional[bool] = None,
                  is_valid: Optional[bool] = None, tyre_compound: Optional[str] = None,
                  pit_in: Optional[bool] = None, pit_out: Optional[bool] = None,
                  position: Optional[int] = None,
                  # 새로운 FastF1 필드들
                  lap_start_time: Optional[datetime] = None, lap_start_date: Optional[datetime] = None,
                  sector1_session_time: Optional[float] = None, sector2_session_time: Optional[float] = None,
                  sector3_session_time: Optional[float] = None, pit_in_time: Optional[datetime] = None,
                  pit_out_time: Optional[datetime] = None, speed_i1: Optional[float] = None,
                  speed_i2: Optional[float] = None, speed_fl: Optional[float] = None,
                  speed_st: Optional[float] = None, tyre_life: Optional[int] = None,
                  fresh_tyre: Optional[bool] = None, is_accurate: Optional[bool] = None,
                  track_status: Optional[str] = None, deleted: Optional[bool] = None,
                  deleted_reason: Optional[str] = None, fast_f1_generated: Optional[bool] = None) -> int:
        """랩 데이터를 저장하거나 업데이트합니다.
        
        Args:
            driver_session_id: 드라이버 세션 ID
            lap_number: 랩 번호
            lap_time: 랩 타임 (초)
            lap_time_string: 형식화된 랩 타임
            sector1_time: 섹터 1 시간 (초)
            sector2_time: 섹터 2 시간 (초)
            sector3_time: 섹터 3 시간 (초)
            is_personal_best: 개인 최고 랩 여부
            is_valid: 유효한 랩 여부
            tyre_compound: 타이어 컴파운드
            pit_in: 피트인 여부
            pit_out: 피트아웃 여부
            position: 랩 완료 시 포지션
            # 새로운 FastF1 필드들
            lap_start_time: 랩 시작 시간
            lap_start_date: 랩 시작 날짜
            sector1_session_time: 섹터1 완료 세션 시간
            sector2_session_time: 섹터2 완료 세션 시간
            sector3_session_time: 섹터3 완료 세션 시간
            pit_in_time: 실제 피트인 시간
            pit_out_time: 실제 피트아웃 시간
            speed_i1: 섹터1 속도트랩
            speed_i2: 섹터2 속도트랩
            speed_fl: 피니시라인 속도트랩
            speed_st: 스트레이트 속도트랩
            tyre_life: 타이어 수명
            fresh_tyre: 새 타이어 여부
            is_accurate: 정확도 플래그
            track_status: 트랙 상태
            deleted: 랩 삭제 여부
            deleted_reason: 삭제 이유
            fast_f1_generated: FastF1에서 생성된 랩 여부
            
        Returns:
            랩 ID
        """
        # 이미 존재하는지 확인
        existing = self.db.fetch_one(
            'SELECT id FROM "live_laps" WHERE driver_session_id = %s AND lap_number = %s',
            driver_session_id, lap_number
        )
        
        if existing:
            # 업데이트
            self.db.execute(
                '''
                UPDATE "live_laps" 
                SET 
                    lap_time = COALESCE(%s, lap_time),
                    lap_time_string = COALESCE(%s, lap_time_string),
                    sector1_time = COALESCE(%s, sector1_time),
                    sector2_time = COALESCE(%s, sector2_time),
                    sector3_time = COALESCE(%s, sector3_time),
                    is_personal_best = COALESCE(%s, is_personal_best),
                    is_valid = COALESCE(%s, is_valid),
                    tyre_compound = COALESCE(%s, tyre_compound),
                    pit_in = COALESCE(%s, pit_in),
                    pit_out = COALESCE(%s, pit_out),
                    position = COALESCE(%s, position),
                    lap_start_time = COALESCE(%s, lap_start_time),
                    lap_start_date = COALESCE(%s, lap_start_date),
                    sector1_session_time = COALESCE(%s, sector1_session_time),
                    sector2_session_time = COALESCE(%s, sector2_session_time),
                    sector3_session_time = COALESCE(%s, sector3_session_time),
                    pit_in_time = COALESCE(%s, pit_in_time),
                    pit_out_time = COALESCE(%s, pit_out_time),
                    speed_i1 = COALESCE(%s, speed_i1),
                    speed_i2 = COALESCE(%s, speed_i2),
                    speed_fl = COALESCE(%s, speed_fl),
                    speed_st = COALESCE(%s, speed_st),
                    tyre_life = COALESCE(%s, tyre_life),
                    fresh_tyre = COALESCE(%s, fresh_tyre),
                    is_accurate = COALESCE(%s, is_accurate),
                    track_status = COALESCE(%s, track_status),
                    deleted = COALESCE(%s, deleted),
                    deleted_reason = COALESCE(%s, deleted_reason),
                    fast_f1_generated = COALESCE(%s, fast_f1_generated)
                WHERE id = %s
                ''',
                lap_time, lap_time_string, sector1_time, sector2_time, sector3_time,
                is_personal_best, is_valid, tyre_compound, pit_in, pit_out, position,
                lap_start_time, lap_start_date, sector1_session_time, sector2_session_time,
                sector3_session_time, pit_in_time, pit_out_time, speed_i1, speed_i2,
                speed_fl, speed_st, tyre_life, fresh_tyre, is_accurate, track_status,
                deleted, deleted_reason, fast_f1_generated, existing[0]
            )
            lap_id = existing[0]
            log.info(f"랩 {driver_session_id}-{lap_number} 업데이트됨 (ID: {lap_id})")
        else:
            # 새로 삽입
            lap_id = self.db.fetch_one(
                '''
                INSERT INTO "live_laps" 
                (driver_session_id, lap_number, lap_time, lap_time_string, 
                 sector1_time, sector2_time, sector3_time, is_personal_best, 
                 is_valid, tyre_compound, pit_in, pit_out, position,
                 lap_start_time, lap_start_date, sector1_session_time, sector2_session_time,
                 sector3_session_time, pit_in_time, pit_out_time, speed_i1, speed_i2,
                 speed_fl, speed_st, tyre_life, fresh_tyre, is_accurate, track_status,
                 deleted, deleted_reason, fast_f1_generated) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
                RETURNING id
                ''',
                driver_session_id, lap_number, lap_time, lap_time_string,
                sector1_time, sector2_time, sector3_time, is_personal_best,
                is_valid, tyre_compound, pit_in, pit_out, position,
                lap_start_time, lap_start_date, sector1_session_time, sector2_session_time,
                sector3_session_time, pit_in_time, pit_out_time, speed_i1, speed_i2,
                speed_fl, speed_st, tyre_life, fresh_tyre, is_accurate, track_status,
                deleted, deleted_reason, fast_f1_generated
            )[0]
            log.info(f"랩 {driver_session_id}-{lap_number} 생성됨 (ID: {lap_id})")
        
        return lap_id
    
    def insert_telemetry_data(self, driver_session_id: int, telemetry_df: pd.DataFrame, session_start_time: datetime = None) -> int:
        """통합 텔레메트리 데이터를 `live_telemetry_data` 테이블에 일괄 삽입합니다.
        
        Args:
            driver_session_id: 드라이버 세션 ID
            telemetry_df: 통합 텔레메트리 데이터프레임 (get_telemetry() 결과)
            session_start_time: 세션 시작 시간 (실제 경기 시간 계산용)
            
        Returns:
            삽입된 행 수
        """
        if telemetry_df.empty:
            return 0
            
        # 데이터프레임에 브레이크 컬럼이 있는지 로그
        log.info(f"텔레메트리 데이터프레임 컬럼: {list(telemetry_df.columns)}")
        if 'Brake' in telemetry_df.columns:
            brake_sample = telemetry_df['Brake'].head(5).tolist()
            brake_dtype = telemetry_df['Brake'].dtype
            log.info(f"원본 브레이크 샘플: {brake_sample}, 타입: {brake_dtype}")
        
        # 세션 시작 시간이 없으면 첫 번째 타임스탬프를 기준으로 설정
        if session_start_time is None:
            session_start_time = datetime.now().replace(microsecond=0)
        
        # 데이터프레임 전처리
        timestamp_col = telemetry_df["Date"]
        
        # 필요한 열 추출 및 None으로 대체
        lap_number = telemetry_df.get("LapNumber", pd.Series([None] * len(telemetry_df)))
        session_time = telemetry_df.get("SessionTime", pd.Series([None] * len(telemetry_df)))
        lap_time = telemetry_df.get("Time", pd.Series([None] * len(telemetry_df)))
        speed = telemetry_df.get("Speed", pd.Series([None] * len(telemetry_df)))
        rpm = telemetry_df.get("RPM", pd.Series([None] * len(telemetry_df)))
        gear = telemetry_df.get("nGear", pd.Series([None] * len(telemetry_df)))
        throttle = telemetry_df.get("Throttle", pd.Series([None] * len(telemetry_df)))
        brake = telemetry_df.get("Brake", pd.Series([None] * len(telemetry_df)))
        drs = telemetry_df.get("DRS", pd.Series([None] * len(telemetry_df)))
        distance = telemetry_df.get("Distance", pd.Series([None] * len(telemetry_df)))
        relative_distance = telemetry_df.get("RelativeDistance", pd.Series([None] * len(telemetry_df)))
        driver_ahead = telemetry_df.get("DriverAhead", pd.Series([None] * len(telemetry_df)))
        distance_to_driver_ahead = telemetry_df.get("DistanceToDriverAhead", pd.Series([None] * len(telemetry_df)))
        source = telemetry_df.get("Source", pd.Series([None] * len(telemetry_df)))
        
        # BRAKE 디버깅 로그 추가
        log.debug(f"텔레메트리 컬럼들: {list(telemetry_df.columns)}")
        if 'Brake' in telemetry_df.columns:
            brake_sample = telemetry_df['Brake'].head(5)
            log.info(f"BRAKE 샘플 데이터: {brake_sample.tolist()}, 타입: {telemetry_df['Brake'].dtype}")
            brake_counts = telemetry_df['Brake'].value_counts()
            log.info(f"BRAKE 값 분포: {brake_counts.to_dict()}")
        else:
            log.warning("BRAKE 컬럼이 텔레메트리 데이터에 없습니다!")
        
        # 시간 단위 변환 (Timedelta를 초로 변환)
        def convert_timedelta_to_seconds(series):
            return series.apply(lambda x: x.total_seconds() if pd.notna(x) and hasattr(x, 'total_seconds') else x)
        
        # 타입 안전 변환 함수들
        def safe_float(value):
            if pd.isna(value): return None
            try: return float(value)
            except (ValueError, TypeError): return None
        
        def safe_int(value):
            if pd.isna(value): return None
            try: return int(value)
            except (ValueError, TypeError): return None
        
        def safe_bool(value):
            if pd.isna(value): return None
            # numpy.bool_ 같은 타입을 파이썬 기본 bool 타입으로 변환
            if hasattr(value, 'item'):
                value = value.item()
            
            if isinstance(value, bool): return value
            if isinstance(value, (int, float)): return bool(value)
            if isinstance(value, str): return value.lower() in ('true', '1', 'yes', 'on')
            return None
        
        session_time = convert_timedelta_to_seconds(session_time)
        lap_time = convert_timedelta_to_seconds(lap_time)
        
        # 데이터 행 준비
        rows = []
        for i in range(len(telemetry_df)):
            timestamp_val = timestamp_col.iloc[i]
            
            if hasattr(timestamp_val, 'to_pydatetime'):
                race_time = timestamp_val.to_pydatetime()
            elif hasattr(timestamp_val, 'total_seconds'):
                race_time = session_start_time + timedelta(seconds=timestamp_val.total_seconds())
            else:
                race_time = timestamp_val
            
            # brake 변환 결과 디버그
            brake_val = brake.iloc[i]
            brake_converted = safe_bool(brake_val)
            log.debug(f"brake[{i}]: {brake_val} ({type(brake_val)}) -> {brake_converted} ({type(brake_converted)})")
            
            rows.append((
                driver_session_id,
                race_time,
                safe_int(lap_number.iloc[i]),
                safe_float(session_time.iloc[i]),
                safe_float(lap_time.iloc[i]),
                safe_float(speed.iloc[i]),
                safe_float(rpm.iloc[i]),
                safe_int(gear.iloc[i]),
                safe_float(throttle.iloc[i]),
                brake_converted,
                safe_int(drs.iloc[i]),
                safe_float(distance.iloc[i]),
                safe_float(relative_distance.iloc[i]),
                str(driver_ahead.iloc[i]) if pd.notna(driver_ahead.iloc[i]) else None,
                safe_float(distance_to_driver_ahead.iloc[i]),
                str(source.iloc[i]) if pd.notna(source.iloc[i]) else 'telemetry'
            ))
        
        # 데이터 일괄 삽입
        sql = '''
        INSERT INTO "live_telemetry_data" 
        (driver_session_id, timestamp, lap_number, session_time, lap_time,
         speed, rpm, gear, throttle, brake, drs, 
         distance, relative_distance, driver_ahead, distance_to_driver_ahead, source) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        '''
        
        self.db.execute_many(sql, rows)
        log.info(f"텔레메트리 데이터 {len(rows)}개 삽입됨 (드라이버 세션 ID: {driver_session_id})")
        
        return len(rows)
    
    def insert_session_status_data(self, session_id: int, status_df: pd.DataFrame, session_start_time: datetime = None) -> int:
        """세션 상태 데이터를 일괄 삽입합니다.
        
        Args:
            session_id: 세션 ID
            status_df: 세션 상태 데이터프레임
            session_start_time: 세션 시작 시간 (실제 경기 시간 계산용)
            
        Returns:
            삽입된 행 수
        """
        if status_df.empty:
            return 0
        
        # 세션 시작 시간이 없으면 첫 번째 타임스탬프를 기준으로 설정
        if session_start_time is None:
            session_start_time = datetime.now().replace(microsecond=0)
            
        # 데이터 행 준비
        rows = []
        for _, row in status_df.iterrows():
            timestamp = row.get("Time")
            if pd.notna(timestamp):
                # Timedelta를 실제 경기 시간으로 변환
                if hasattr(timestamp, 'total_seconds'):
                    # 세션 시작 시간에서 상대 시간을 더해 실제 경기 시간 계산
                    race_time = session_start_time + timedelta(seconds=timestamp.total_seconds())
                else:
                    race_time = session_start_time
                
                rows.append((
                    session_id,
                    race_time,
                    str(row.get("Status", "")),
                    int(row.get("TimeRemaining")) if pd.notna(row.get("TimeRemaining")) else None
                ))
        
        if not rows:
            return 0
            
        sql = '''
        INSERT INTO "live_session_status" 
        (session_id, timestamp, status, time_remaining) 
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (session_id, timestamp) DO NOTHING
        '''
        
        self.db.execute_many(sql, rows)
        log.info(f"세션 상태 데이터 {len(rows)}개 삽입됨 (세션 ID: {session_id})")
        
        return len(rows)
    
    def insert_track_status_data(self, session_id: int, status_df: pd.DataFrame, session_start_time: datetime = None) -> int:
        """트랙 상태 데이터를 일괄 삽입합니다.
        
        Args:
            session_id: 세션 ID  
            status_df: 트랙 상태 데이터프레임
            session_start_time: 세션 시작 시간 (실제 경기 시간 계산용)
            
        Returns:
            삽입된 행 수
        """
        if status_df.empty:
            return 0
        
        # 세션 시작 시간이 없으면 첫 번째 타임스탬프를 기준으로 설정
        if session_start_time is None:
            session_start_time = datetime.now().replace(microsecond=0)
            
        # 데이터 행 준비
        rows = []
        for _, row in status_df.iterrows():
            timestamp = row.get("Time")
            if pd.notna(timestamp):
                # Timedelta를 실제 경기 시간으로 변환
                if hasattr(timestamp, 'total_seconds'):
                    # 세션 시작 시간에서 상대 시간을 더해 실제 경기 시간 계산
                    race_time = session_start_time + timedelta(seconds=timestamp.total_seconds())
                else:
                    race_time = session_start_time
                
                rows.append((
                    session_id,
                    race_time,
                    str(row.get("Status", "")),
                    str(row.get("Message", "")) if pd.notna(row.get("Message")) else None
                ))
        
        if not rows:
            return 0
            
        sql = '''
        INSERT INTO "live_track_status" 
        (session_id, timestamp, status, message) 
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (session_id, timestamp) DO NOTHING
        '''
        
        self.db.execute_many(sql, rows)
        log.info(f"트랙 상태 데이터 {len(rows)}개 삽입됨 (세션 ID: {session_id})")
        
        return len(rows)
    
    def insert_pit_stop_data(self, driver_session_id: int, pit_stops_df: pd.DataFrame) -> int:
        """피트스톱 데이터를 일괄 삽입합니다.
        
        Args:
            driver_session_id: 드라이버 세션 ID
            pit_stops_df: 피트스톱 데이터프레임
            
        Returns:
            삽입된 행 수
        """
        if pit_stops_df.empty:
            return 0
            
        # 데이터 행 준비
        rows = []
        for _, row in pit_stops_df.iterrows():
            lap_number = row.get("LapNumber")
            if pd.notna(lap_number):
                # 피트스톱 시간 처리
                pit_time = None
                pit_time_str = None
                if pd.notna(row.get("PitTime")):
                    pit_time_value = row.get("PitTime")
                    if hasattr(pit_time_value, 'total_seconds'):
                        pit_time = pit_time_value.total_seconds()
                        pit_time_str = str(pit_time_value)
                
                # 총 소요 시간 계산 (피트인/아웃 시간 차이)
                total_duration = None
                pit_in_time = row.get("PitInTime")
                pit_out_time = row.get("PitOutTime")
                if pd.notna(pit_in_time) and pd.notna(pit_out_time):
                    if hasattr(pit_in_time, 'total_seconds') and hasattr(pit_out_time, 'total_seconds'):
                        total_duration = pit_out_time.total_seconds() - pit_in_time.total_seconds()
                
                rows.append((
                    driver_session_id,
                    int(lap_number),
                    pit_time,
                    pit_time_str,
                    total_duration
                ))
        
        if not rows:
            return 0
            
        sql = '''
        INSERT INTO "live_pit_stops" 
        (driver_session_id, lap_number, stop_time, stop_time_string, total_duration) 
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (driver_session_id, lap_number) DO UPDATE SET
            stop_time = EXCLUDED.stop_time,
            stop_time_string = EXCLUDED.stop_time_string,
            total_duration = EXCLUDED.total_duration
        '''
        
        self.db.execute_many(sql, rows)
        log.info(f"피트스톱 데이터 {len(rows)}개 삽입됨 (드라이버 세션 ID: {driver_session_id})")
        
        return len(rows)
    
    def insert_tyre_stint_data(self, driver_session_id: int, stints_df: pd.DataFrame) -> int:
        """타이어 스틴트 데이터를 일괄 삽입합니다.
        
        Args:
            driver_session_id: 드라이버 세션 ID
            stints_df: 타이어 스틴트 데이터프레임
            
        Returns:
            삽입된 행 수
        """
        if stints_df.empty:
            return 0
            
        # 데이터 행 준비
        rows = []
        for _, row in stints_df.iterrows():
            stint_number = row.get("StintNumber")
            if pd.notna(stint_number):
                rows.append((
                    driver_session_id,
                    int(stint_number),
                    str(row.get("Compound")) if pd.notna(row.get("Compound")) else None,
                    int(row.get("StartLap")) if pd.notna(row.get("StartLap")) else None,
                    int(row.get("EndLap")) if pd.notna(row.get("EndLap")) else None,
                    int(row.get("Laps")) if pd.notna(row.get("Laps")) else None
                ))
        
        if not rows:
            return 0
            
        sql = '''
        INSERT INTO "live_tyre_stints" 
        (driver_session_id, stint_number, compound, start_lap, end_lap, laps) 
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (driver_session_id, stint_number) DO UPDATE SET
            compound = EXCLUDED.compound,
            start_lap = EXCLUDED.start_lap,
            end_lap = EXCLUDED.end_lap,
            laps = EXCLUDED.laps
        '''
        
        self.db.execute_many(sql, rows)
        log.info(f"타이어 스틴트 데이터 {len(rows)}개 삽입됨 (드라이버 세션 ID: {driver_session_id})")
        
        return len(rows)
    
    def insert_weather_data(self, session_id: int, weather_df: pd.DataFrame, session_start_time: datetime = None) -> int:
        """날씨 데이터를 일괄 삽입합니다.
        
        Args:
            session_id: 세션 ID
            weather_df: 날씨 데이터프레임
            session_start_time: 세션 시작 시간 (실제 경기 시간 계산용)
            
        Returns:
            삽입된 행 수
        """
        if weather_df.empty:
            return 0
        
        # 세션 시작 시간이 없으면 첫 번째 타임스탬프를 기준으로 설정
        if session_start_time is None:
            session_start_time = datetime.now().replace(microsecond=0)
            
        # 데이터 행 준비
        rows = []
        for _, row in weather_df.iterrows():
            timestamp = row.get("Time")
            if pd.notna(timestamp):
                # Timedelta를 실제 경기 시간으로 변환
                if hasattr(timestamp, 'total_seconds'):
                    # 세션 시작 시간에서 상대 시간을 더해 실제 경기 시간 계산
                    race_time = session_start_time + timedelta(seconds=timestamp.total_seconds())
                else:
                    race_time = session_start_time
                
                rows.append((
                    session_id,
                    race_time,
                    float(row.get("AirTemp")) if pd.notna(row.get("AirTemp")) else None,
                    float(row.get("TrackTemp")) if pd.notna(row.get("TrackTemp")) else None,
                    float(row.get("Humidity")) if pd.notna(row.get("Humidity")) else None,
                    float(row.get("Pressure")) if pd.notna(row.get("Pressure")) else None,
                    float(row.get("WindSpeed")) if pd.notna(row.get("WindSpeed")) else None,
                    float(row.get("WindDirection")) if pd.notna(row.get("WindDirection")) else None,
                    bool(row.get("Rainfall")) if pd.notna(row.get("Rainfall")) else None
                ))
        
        if not rows:
            return 0
            
        sql = '''
        INSERT INTO "live_weather_data" 
        (session_id, timestamp, air_temp, track_temp, humidity, pressure, 
         wind_speed, wind_direction, is_raining) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        '''
        
        self.db.execute_many(sql, rows)
        log.info(f"날씨 데이터 {len(rows)}개 삽입됨 (세션 ID: {session_id})")
        
        return len(rows)
    
    def insert_position_data(self, driver_session_id: int, telemetry_df: pd.DataFrame, session_start_time: datetime = None) -> int:
        """통합 텔레메트리 데이터를 `live_position_data` 테이블에 일괄 삽입합니다.
        
        Args:
            driver_session_id: 드라이버 세션 ID
            telemetry_df: 통합 텔레메트리 데이터프레임 (get_telemetry() 결과)
            session_start_time: 세션 시작 시간 (실제 경기 시간 계산용)
            
        Returns:
            삽입된 행 수
        """
        if telemetry_df.empty:
            return 0
        
        # 세션 시작 시간이 없으면 첫 번째 타임스탬프를 기준으로 설정
        if session_start_time is None:
            session_start_time = datetime.now().replace(microsecond=0)
        
        # 데이터프레임 전처리
        timestamp_col = telemetry_df["Date"]
        
        # 위치 데이터 추출
        x = telemetry_df.get("X", pd.Series([None] * len(telemetry_df)))
        y = telemetry_df.get("Y", pd.Series([None] * len(telemetry_df)))
        z = telemetry_df.get("Z", pd.Series([None] * len(telemetry_df)))
        status = telemetry_df.get("Status", pd.Series([None] * len(telemetry_df)))
        
        # 타입 안전 변환 함수
        def safe_float(value):
            if pd.isna(value): return None
            try: return float(value)
            except (ValueError, TypeError): return None
        
        # 데이터 행 준비
        rows = []
        for i in range(len(telemetry_df)):
            x_val = safe_float(x.iloc[i])
            y_val = safe_float(y.iloc[i])
            
            if x_val is None or y_val is None:
                continue
            
            timestamp_val = timestamp_col.iloc[i]
            if hasattr(timestamp_val, 'to_pydatetime'):
                race_time = timestamp_val.to_pydatetime()
            elif hasattr(timestamp_val, 'total_seconds'):
                race_time = session_start_time + timedelta(seconds=timestamp_val.total_seconds())
            else:
                race_time = timestamp_val
            
            rows.append((
                driver_session_id,
                race_time,
                x_val,
                y_val,
                safe_float(z.iloc[i]),
                str(status.iloc[i]) if pd.notna(status.iloc[i]) else None
            ))
        
        if not rows:
            return 0
            
        # 데이터 일괄 삽입
        sql = '''
        INSERT INTO "live_position_data" 
        (driver_session_id, timestamp, x, y, z, status) 
        VALUES (%s, %s, %s, %s, %s, %s)
        '''
        
        self.db.execute_many(sql, rows)
        log.info(f"위치 데이터 {len(rows)}개 삽입됨 (드라이버 세션 ID: {driver_session_id})")
        
        return len(rows)

    def insert_session_messages(self, session_id: int, messages_df: pd.DataFrame, 
                               session_start_time: Optional[datetime] = None) -> int:
        """세션 메시지 데이터를 삽입합니다.
        
        Args:
            session_id: 세션 ID
            messages_df: 메시지 데이터프레임
            session_start_time: 세션 시작 시간 (경기 시간 계산용)
            
        Returns:
            삽입된 레코드 수
        """
        if messages_df.empty:
            return 0
        
        rows = []
        for _, row in messages_df.iterrows():
            # 시간 데이터 변환 (경기 시간으로)
            timestamp = None
            if 'Time' in row and pd.notna(row['Time']):
                if hasattr(row['Time'], 'to_pydatetime'):
                    timestamp = row['Time'].to_pydatetime()
                elif hasattr(row['Time'], 'total_seconds') and session_start_time:
                    timestamp = session_start_time + timedelta(seconds=row['Time'].total_seconds())
                else:
                    timestamp = row['Time']
            
            # 메시지 분류 및 내용
            category = str(row.get('Category', '')) if pd.notna(row.get('Category')) else None
            message = str(row.get('Message', '')) if pd.notna(row.get('Message')) else None
            status = str(row.get('Status', '')) if pd.notna(row.get('Status')) else None
            flag_type = str(row.get('Flag', '')) if pd.notna(row.get('Flag')) else None
            scope = str(row.get('Scope', '')) if pd.notna(row.get('Scope')) else None
            
            # 메시지가 없는 경우 건너뛰기
            if not message:
                continue
            
            rows.append((
                session_id,
                timestamp,
                category,
                message,
                status,
                flag_type,
                scope
            ))
        
        if not rows:
            return 0
            
        sql = '''
        INSERT INTO "live_session_messages" 
        (session_id, timestamp, category, message, status, flag_type, scope) 
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        '''
        
        self.db.execute_many(sql, rows)
        log.info(f"세션 메시지 {len(rows)}개 삽입됨 (세션 ID: {session_id})")
        
        return len(rows)
