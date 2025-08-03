"""
ETL 프로세서 - 메인 ETL 로직

FastF1 데이터를 가져와서 데이터베이스에 저장하는 핵심 로직을 담당합니다.
"""

import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from core.database import DatabaseManager
from f1_api import (
    fetch_season_info, fetch_season_schedule, fetch_event_data, 
    fetch_session_results, fetch_lap_data, 
    fetch_merged_telemetry, fetch_pit_stops,
    fetch_tyre_stints, fetch_weather_data,
    fetch_session_messages
)

log = logging.getLogger(__name__)


class ETLProcessor:
    """ETL 프로세싱 핵심 클래스"""
    
    # 세션 타입 매핑
    SESSION_NAME_MAP = {
        "FP1": "Practice 1",
        "FP2": "Practice 2", 
        "FP3": "Practice 3",
        "Q": "Qualifying",
        "S": "Sprint",
        "SQ": "Sprint Qualifying",
        "R": "Race"
    }
    
    def __init__(self, db_manager: DatabaseManager):
        """ETL 프로세서 초기화"""
        self.db_manager = db_manager
        self.common_repo = db_manager.get_common_repository()
        self.live_repo = db_manager.get_live_repository()
    
    def fetch_season_schedule(self, year: int) -> List[Dict]:
        """시즌 일정 가져오기"""
        try:
            log.info(f"시즌 {year} 일정 조회 중...")
            schedule = fetch_season_schedule(year)
            log.info(f"시즌 {year} 일정 조회 완료: {len(schedule)}개 라운드")
            return schedule
        except Exception as e:
            log.error(f"시즌 {year} 일정 조회 실패: {e}")
            raise
    
    def process_session(self, year: int, round_num: int, session_type: str, 
                       include_telemetry: bool = False, force: bool = False) -> bool:
        """세션 데이터 처리
        
        Args:
            year: 시즌 연도
            round_num: 라운드 번호
            session_type: 세션 유형
            include_telemetry: 텔레메트리 데이터 포함 여부
            force: 강제 처리 여부
            
        Returns:
            처리 성공 여부
        """
        try:
            log.info(f"세션 처리 시작: {year} 시즌 {round_num}라운드 {session_type} (force={force})")
            
            # 0. 세션 타입 존재 여부 확인
            if not self._session_exists(year, round_num, session_type):
                log.info(f"세션 {session_type}이 존재하지 않습니다. 건너뜁니다.")
                return True  # 존재하지 않는 세션은 성공으로 처리
            
            # 1. 이미 처리된 세션인지 확인
            if not force and self._is_session_processed(year, round_num, session_type):
                log.info(f"세션 {session_type}는 이미 처리되었습니다. 건너뜁니다.")
                return True
            
            log.info(f"세션 {session_type} 데이터 처리를 진행합니다.")
            
            # 2. 기본 메타데이터 처리
            season_id, event_id, session_id, live_event_id, live_session_id = \
                self._process_metadata(year, round_num, session_type)
            
            log.debug(f"메타데이터 처리 완료: session_id={session_id}, live_session_id={live_session_id}")
            
            # 3. 세션 결과 및 드라이버 데이터 처리
            success = self._process_session_data(
                year, round_num, session_type,
                session_id, live_session_id,
                include_telemetry
            )
            
            if success:
                # 4. 세션 처리 완료 마킹
                self._mark_session_completed(session_id)
                log.info(f"세션 처리 완료: {year} 시즌 {round_num}라운드 {session_type}")
            else:
                log.error(f"세션 처리 실패: {year} 시즌 {round_num}라운드 {session_type}")
            
            return success
            
        except Exception as e:
            log.error(f"세션 처리 중 오류: {year} 시즌 {round_num}라운드 {session_type} - {e}")
            return False
    
    def _is_session_processed(self, year: int, round_num: int, session_type: str) -> bool:
        """세션이 이미 처리되었는지 확인"""
        try:
            result = self.common_repo.db.fetch_one("""
                SELECT cs.results_fetched 
                FROM common_sessions cs
                JOIN common_events ce ON cs.event_id = ce.id
                JOIN common_seasons csn ON ce.season_id = csn.id
                WHERE csn.year = %s AND ce.round = %s AND cs.type = %s
            """, year, round_num, session_type)
            
            is_processed = result and result[0] is True
            log.debug(f"세션 처리 여부 확인: {year} R{round_num} {session_type} -> {is_processed} (result: {result})")
            return is_processed
        except Exception as e:
            log.debug(f"세션 처리 여부 확인 실패: {e}")
            return False
    
    def _session_exists(self, year: int, round_num: int, session_type: str) -> bool:
        """해당 이벤트에 세션 타입이 존재하는지 확인"""
        try:
            import fastf1
            
            # FastF1을 사용하여 세션 존재 여부 확인
            try:
                session = fastf1.get_session(year, round_num, session_type)
                # 세션 로드를 시도해보기 (실제로 데이터가 있는지 확인)
                session.load()
                return True
            except Exception as e:
                # 세션이 존재하지 않거나 로드할 수 없는 경우
                error_msg = str(e).lower()
                if "does not exist" in error_msg or "not found" in error_msg:
                    log.debug(f"세션 {session_type}이 존재하지 않음: {year} R{round_num}")
                    return False
                else:
                    # 다른 에러인 경우 일단 존재한다고 가정하고 처리 시도
                    log.warning(f"세션 존재 여부 확인 중 오류 (처리 시도): {e}")
                    return True
                    
        except Exception as e:
            log.warning(f"세션 존재 여부 확인 실패 (처리 시도): {e}")
            return True  # 불확실한 경우 처리를 시도
    
    def _process_metadata(self, year: int, round_num: int, session_type: str) -> Tuple[int, int, int, int, int]:
        """기본 메타데이터 처리 (시즌, 이벤트, 세션)"""
        log.debug(f"메타데이터 처리 시작: {year}-{round_num}-{session_type}")
        
        # 1. 이벤트 데이터 가져오기
        event_data = fetch_event_data(year, round_num)
        
        # 2. 시즌 정보 처리
        season_info = fetch_season_info(year)
        season_id = self.common_repo.upsert_season(
            year=year,
            name=season_info["name"],
            start_date=season_info["start_date"],
            end_date=season_info["end_date"]
        )
        
        # 3. 서킷 정보 처리
        circuit_id = self.common_repo.upsert_circuit(
            name=event_data["circuit_name"],
            short_name=event_data.get("circuit_short_name"),
            locality=event_data.get("circuit_locality"),
            country=event_data.get("country"),
            latitude=event_data.get("circuit_latitude"),
            longitude=event_data.get("circuit_longitude"),
            length=event_data.get("circuit_length"),
            turns=event_data.get("circuit_turns")
        )
        
        # 4. 이벤트 정보 처리
        event_id = self.common_repo.upsert_event(
            season_id=season_id,
            circuit_id=circuit_id,
            round_num=event_data["round"],
            name=event_data["name"],
            short_name=event_data.get("short_name"),
            event_start=event_data["event_start"],
            event_end=event_data["event_end"]
        )
        
        # 5. 라이브 이벤트 처리
        live_event_id = self.live_repo.upsert_live_event(
            common_event_id=event_id,
            season_id=season_id,
            circuit_id=circuit_id
        )
        
        # 6. 세션 정보 처리
        session_duration = self._get_session_duration(year, round_num, session_type)
        session_name = self.SESSION_NAME_MAP.get(session_type, session_type)
        
        session_id = self.common_repo.upsert_session(
            event_id=event_id,
            session_type=session_type,
            name=session_name,
            date=event_data["event_date"],
            duration=session_duration,
            results_fetched=False
        )
        
        # 7. 라이브 세션 처리
        live_session_id = self.live_repo.upsert_live_session(
            live_event_id=live_event_id,
            common_session_id=session_id,
            common_event_id=event_id
        )
        
        log.debug(f"메타데이터 처리 완료: season_id={season_id}, event_id={event_id}, session_id={session_id}")
        return season_id, event_id, session_id, live_event_id, live_session_id
    
    def _get_session_duration(self, year: int, round_num: int, session_type: str) -> Optional[int]:
        """세션 지속시간 가져오기"""
        try:
            _, _, duration = fetch_session_results(year, round_num, session_type)
            return duration
        except Exception:
            return None
    
    def _process_session_data(self, year: int, round_num: int, session_type: str,
                             session_id: int, live_session_id: int, 
                             include_telemetry: bool) -> bool:
        """세션 데이터 처리 (드라이버, 랩, 텔레메트리 등)"""
        try:
            log.info(f"세션 데이터 처리 시작: {session_type}")
            
            # 1. 세션 결과 가져오기
            driver_results, session_obj, _ = fetch_session_results(year, round_num, session_type)
            
            # DataFrame이 비어있는지 확인 (pandas DataFrame의 경우)
            if driver_results is None or (hasattr(driver_results, 'empty') and driver_results.empty):
                log.warning(f"세션 결과가 없습니다: {session_type}")
                return False
            
            # 리스트나 다른 타입인 경우
            if isinstance(driver_results, list) and len(driver_results) == 0:
                log.warning(f"세션 결과가 없습니다: {session_type}")
                return False
            
            log.debug(f"세션 {session_type}: {len(driver_results)}명 드라이버 데이터 발견")
            processed_drivers = 0
            
            # 2. 각 드라이버별 데이터 처리
            for idx, driver_row in driver_results.iterrows():
                try:
                    # pandas Series를 딕셔너리로 변환
                    driver_result = driver_row.to_dict()
                    
                    if self._process_driver_session(
                        driver_result, live_session_id, 
                        year, round_num, session_type, 
                        include_telemetry, session_obj
                    ):
                        processed_drivers += 1
                        log.debug(f"드라이버 {driver_result.get('DriverNumber', 'Unknown')} 처리 완료")
                except Exception as e:
                    driver_number = driver_row.get('DriverNumber', 'Unknown')
                    log.error(f"드라이버 {driver_number} 처리 실패: {e}")
            
            # 3. 추가 세션 데이터 처리 (날씨, 메시지 등)
            self._process_additional_session_data(session_id, session_obj)
            self._process_session_status_data(session_id, session_obj)
            
            log.info(f"세션 데이터 처리 완료: {processed_drivers}명 드라이버 처리")
            return processed_drivers > 0
            
        except Exception as e:
            log.error(f"세션 데이터 처리 실패: {e}")
            return False
    
    def _process_driver_session(self, driver_result: Dict, live_session_id: int,
                               year: int, round_num: int, session_type: str,
                               include_telemetry: bool, session_obj) -> bool:
        """개별 드라이버 세션 데이터 처리"""
        try:
            # FastF1 DataFrame의 컬럼명 사용
            driver_number = driver_result.get('DriverNumber')
            if driver_number is None:
                log.warning("드라이버 번호가 없는 데이터 건너뜀")
                return False
                
            log.debug(f"드라이버 {driver_number} 데이터 처리 시작")
            
            # 1. 드라이버 정보 생성/업데이트
            driver_id = self._ensure_driver_exists(driver_result)
            
            # 2. 팀 정보 생성/업데이트  
            team_id = self._ensure_team_exists(driver_result)
            
            # 3. 드라이버 세션 생성
            driver_session_id = self.live_repo.upsert_driver_session(
                session_id=live_session_id,
                driver_id=driver_id,
                team_id=team_id,
                car_number=driver_number,
                position=self._safe_int(driver_result.get('Position')),
                grid_position=self._safe_int(driver_result.get('GridPosition')),
                status=driver_result.get('Status'),
                points=self._safe_float(driver_result.get('Points'))
            )
            
            # 4. 랩 데이터 처리
            lap_data = fetch_lap_data(session_obj, driver_number)
            self._process_lap_data(driver_number, driver_session_id, lap_data, session_obj)
            
            # 5. 텔레메트리 데이터 처리 (옵션)
            if include_telemetry:
                self._process_telemetry_data(driver_number, driver_session_id, lap_data, session_obj)
            
            # 4. 피트스톱 데이터 처리
            self._process_pitstop_data(driver_number, driver_session_id, session_obj)
            
            # 5. 타이어 스틴트 데이터 처리
            self._process_tyre_stint_data(driver_number, driver_session_id, session_obj)
            
            log.debug(f"드라이버 {driver_number} 데이터 처리 완료")
            return True
            
        except Exception as e:
            log.error(f"드라이버 세션 처리 실패: {e}")
            return False
    
    def _process_lap_data(self, driver_number: int, driver_session_id: int, lap_data: pd.DataFrame, session_obj):
        """랩 데이터 처리"""
        try:
            if lap_data is not None and not lap_data.empty:
                inserted_count = 0
                
                # 세션 시작 시간 확인
                session_start_time = getattr(session_obj, 'date', None)
                if session_start_time is None:
                    # 대안으로 session 정보에서 찾기
                    session_start_time = getattr(session_obj, 'session_start_time', None)
                
                for _, lap_row in lap_data.iterrows():
                    try:
                        # DataFrame 행을 딕셔너리로 변환하고 NaN을 None으로 변환
                        lap_dict = lap_row.to_dict()
                        lap_dict = {k: (None if pd.isna(v) else v) for k, v in lap_dict.items()}
                        
                        # upsert_lap 메서드 파라미터에 맞게 매핑
                        lap_id = self.live_repo.upsert_lap(
                            driver_session_id=driver_session_id,
                            lap_number=self._safe_int(lap_dict.get('LapNumber')),
                            lap_time=self._safe_float(lap_dict.get('LapTime')),
                            lap_time_string=lap_dict.get('LapTimeString'),
                            sector1_time=self._safe_float(lap_dict.get('Sector1Time')),
                            sector2_time=self._safe_float(lap_dict.get('Sector2Time')),
                            sector3_time=self._safe_float(lap_dict.get('Sector3Time')),
                            is_personal_best=lap_dict.get('IsPersonalBest'),
                            is_valid=lap_dict.get('IsValid'),
                            tyre_compound=lap_dict.get('Compound'),
                            pit_in=lap_dict.get('PitIn'),
                            pit_out=lap_dict.get('PitOut'),
                            position=self._safe_int(lap_dict.get('Position')),
                            lap_start_time=self._safe_datetime(lap_dict.get('LapStartTime'), session_start_time),
                            lap_start_date=self._safe_datetime(lap_dict.get('LapStartDate'), session_start_time),
                            sector1_session_time=self._safe_float(lap_dict.get('Sector1SessionTime')),
                            sector2_session_time=self._safe_float(lap_dict.get('Sector2SessionTime')),
                            sector3_session_time=self._safe_float(lap_dict.get('Sector3SessionTime')),
                            pit_in_time=self._safe_datetime(lap_dict.get('PitInTime'), session_start_time),
                            pit_out_time=self._safe_datetime(lap_dict.get('PitOutTime'), session_start_time),
                            speed_i1=self._safe_float(lap_dict.get('SpeedI1')),
                            speed_i2=self._safe_float(lap_dict.get('SpeedI2')),
                            speed_fl=self._safe_float(lap_dict.get('SpeedFL')),
                            speed_st=self._safe_float(lap_dict.get('SpeedST')),
                            tyre_life=self._safe_int(lap_dict.get('TyreLife')),
                            fresh_tyre=lap_dict.get('FreshTyre'),
                            is_accurate=lap_dict.get('IsAccurate'),
                            track_status=lap_dict.get('TrackStatus'),
                            deleted=lap_dict.get('Deleted'),
                            deleted_reason=lap_dict.get('DeletedReason'),
                            fast_f1_generated=lap_dict.get('FastF1Generated')
                        )
                        inserted_count += 1
                    except Exception as e:
                        log.warning(f"드라이버 {driver_number} 랩 {lap_dict.get('LapNumber', 'Unknown')} 처리 실패: {e}")
                        
                log.debug(f"드라이버 {driver_number}: {inserted_count}개 랩 데이터 처리")
        except Exception as e:
            log.warning(f"드라이버 {driver_number} 랩 데이터 처리 실패: {e}")
    
    def _process_telemetry_data(self, driver_number: int, driver_session_id: int, lap_data: pd.DataFrame, session_obj):
        """텔레메트리 데이터 처리"""
        try:
            # 텔레메트리 데이터는 랩별로 처리
            if lap_data is not None and not lap_data.empty:
                total_telemetry = 0
                
                for _, lap_row in lap_data.iterrows():
                    try:
                        # 개별 랩의 텔레메트리 가져오기
                        # 이 부분은 FastF1 API 구조에 따라 조정 필요
                        lap_telemetry = fetch_merged_telemetry(lap_row)
                        
                        if lap_telemetry is not None and not lap_telemetry.empty:
                            session_start_time = getattr(session_obj, 'date', None)
                            inserted_count = self.live_repo.insert_telemetry_data(
                                driver_session_id, lap_telemetry, session_start_time
                            )
                            self.live_repo.insert_position_data(
                                driver_session_id, lap_telemetry, session_start_time
                            )
                            total_telemetry += inserted_count
                    except Exception as e:
                        log.warning(f"드라이버 {driver_number} 랩 {lap_row.get('LapNumber', 'Unknown')} 텔레메트리 처리 실패: {e}")
                
                log.debug(f"드라이버 {driver_number}: {total_telemetry}개 텔레메트리 데이터 처리")
                
        except Exception as e:
            log.warning(f"드라이버 {driver_number} 텔레메트리 데이터 처리 실패: {e}")
    
    def _process_pitstop_data(self, driver_number: int, driver_session_id: int, session_obj):
        """피트스톱 데이터 처리"""
        try:
            pitstop_data = fetch_pit_stops(session_obj)
            if pitstop_data is not None and not pitstop_data.empty:
                # 특정 드라이버의 피트스톱만 필터링
                if 'driver_number' in pitstop_data.columns:
                    driver_pitstops = pitstop_data[pitstop_data['driver_number'] == driver_number]
                else:
                    driver_pitstops = pitstop_data
                
                if not driver_pitstops.empty:
                    inserted_count = self.live_repo.insert_pit_stop_data(driver_session_id, driver_pitstops)
                    log.debug(f"드라이버 {driver_number}: {inserted_count}개 피트스톱 데이터 처리")
        except Exception as e:
            log.warning(f"드라이버 {driver_number} 피트스톱 데이터 처리 실패: {e}")
    
    def _process_tyre_stint_data(self, driver_number: int, driver_session_id: int, session_obj):
        """타이어 스틴트 데이터 처리"""
        try:
            stint_data = fetch_tyre_stints(session_obj)
            if stint_data is not None and not stint_data.empty:
                # 특정 드라이버의 스틴트만 필터링
                if 'driver_number' in stint_data.columns:
                    driver_stints = stint_data[stint_data['driver_number'] == driver_number]
                else:
                    driver_stints = stint_data
                
                if not driver_stints.empty:
                    inserted_count = self.live_repo.insert_tyre_stint_data(driver_session_id, driver_stints)
                    log.debug(f"드라이버 {driver_number}: {inserted_count}개 타이어 스틴트 데이터 처리")
        except Exception as e:
            log.warning(f"드라이버 {driver_number} 타이어 스틴트 데이터 처리 실패: {e}")
    
    def _process_additional_session_data(self, session_id: int, session_obj):
        """추가 세션 데이터 처리 (날씨, 메시지 등)"""
        try:
            session_start_time = getattr(session_obj, 'date', None)

            # 날씨 데이터 처리
            try:
                weather_data = fetch_weather_data(session_obj)
                if weather_data is not None and not weather_data.empty:
                    self.live_repo.insert_weather_data(session_id, weather_data, session_start_time)
                    log.debug(f"날씨 데이터 {len(weather_data)}개 처리됨")
            except Exception as e:
                log.warning(f"날씨 데이터 처리 실패: {e}")
            
            # 세션 메시지 처리
            try:
                session_messages = fetch_session_messages(session_obj)
                if session_messages is not None and not session_messages.empty:
                    self.live_repo.insert_session_messages(session_id, session_messages, session_start_time)
                    log.debug(f"세션 메시지 {len(session_messages)}개 처리됨")
            except Exception as e:
                log.warning(f"세션 메시지 처리 실패: {e}")
                
        except Exception as e:
            log.warning(f"추가 세션 데이터 처리 실패: {e}")
    
    def _process_session_status_data(self, session_id: int, session_obj):
        """세션 및 트랙 상태 데이터 처리"""
        try:
            session_start_time = getattr(session_obj, 'date', None)

            # 세션 상태 데이터 처리
            if hasattr(session_obj, 'session_status') and session_obj.session_status is not None:
                self.live_repo.insert_session_status_data(session_id, session_obj.session_status, session_start_time)
                log.debug(f"세션 상태 데이터 {len(session_obj.session_status)}개 처리됨")

            # 트랙 상태 데이터 처리
            if hasattr(session_obj, 'track_status') and session_obj.track_status is not None:
                self.live_repo.insert_track_status_data(session_id, session_obj.track_status, session_start_time)
                log.debug(f"트랙 상태 데이터 {len(session_obj.track_status)}개 처리됨")

        except Exception as e:
            log.warning(f"세션/트랙 상태 데이터 처리 실패: {e}")

    def _mark_session_completed(self, session_id: int):
        """세션 처리 완료 마킹"""
        try:
            self.common_repo.db.execute(
                'UPDATE common_sessions SET results_fetched = TRUE WHERE id = %s',
                session_id
            )
            log.debug(f"세션 {session_id} 처리 완료 마킹")
        except Exception as e:
            log.error(f"세션 완료 마킹 실패: {e}")

    def _ensure_driver_exists(self, driver_result: Dict) -> int:
        """드라이버가 데이터베이스에 존재하는지 확인하고, 없으면 생성"""
        try:
            # FastF1 데이터에서 드라이버 정보 추출
            driver_code = driver_result.get('Abbreviation') or f"D{driver_result.get('DriverNumber', 0)}"
            driver_number = self._safe_int(driver_result.get('DriverNumber'))
            full_name = driver_result.get('FullName', driver_code)
            nationality = driver_result.get('Nationality')
            dob = driver_result.get('DateOfBirth')
            
            # 드라이버 코드는 최대 3글자로 제한
            if len(driver_code) > 3:
                driver_code = driver_code[:3]
            
            driver_id = self.common_repo.upsert_driver(
                code=driver_code,
                number=driver_number,
                full_name=full_name,
                dob=dob,
                nationality=nationality
            )
            
            return driver_id
            
        except Exception as e:
            log.error(f"드라이버 생성 실패: {e}")
            # 기본 드라이버 생성
            default_code = f"D{driver_result.get('DriverNumber', 0)}"[:3]
            return self.common_repo.upsert_driver(
                code=default_code,
                number=self._safe_int(driver_result.get('DriverNumber')),
                full_name=driver_result.get('FullName', default_code)
            )
    
    def _ensure_team_exists(self, driver_result: Dict) -> int:
        """팀이 데이터베이스에 존재하는지 확인하고, 없으면 생성"""
        try:
            # FastF1 데이터에서 팀 정보 추출
            team_name = driver_result.get('TeamName', 'Unknown Team')
            team_nationality = driver_result.get('TeamNationality')
            team_color = driver_result.get('TeamColor')
            
            # 팀 이름에서 짧은 이름 생성 (공백 제거 후 첫 3글자)
            short_name = ''.join(team_name.split())[:3].upper() if team_name else 'UNK'
            
            team_id = self.common_repo.upsert_team(
                name=team_name,
                short_name=short_name,
                nationality=team_nationality,
                color=team_color
            )
            
            return team_id
            
        except Exception as e:
            log.error(f"팀 생성 실패: {e}")
            # 기본 팀 생성
            return self.common_repo.upsert_team(
                name='Unknown Team',
                short_name='UNK'
            )
    
    def _safe_int(self, value) -> Optional[int]:
        """값을 안전하게 정수로 변환"""
        if value is None:
            return None
        
        try:
            # pandas의 NaN이나 NA 체크
            if pd.isna(value):
                return None
            
            # 문자열인 경우 공백 제거
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
            
            # 정수로 변환
            result = int(float(value))
            
            # PostgreSQL SMALLINT 범위 체크 (-32768 ~ 32767)
            if result < -32768 or result > 32767:
                log.warning(f"정수 값 {result}가 SMALLINT 범위를 벗어남, NULL로 처리")
                return None
                
            return result
            
        except (ValueError, TypeError, OverflowError) as e:
            log.debug(f"정수 변환 실패 '{value}': {e}")
            return None
    
    def _safe_float(self, value) -> Optional[float]:
        """값을 안전하게 실수로 변환"""
        if value is None:
            return None
            
        try:
            # pandas의 NaN이나 NA 체크
            if pd.isna(value):
                return None
            
            # pandas Timedelta 객체 처리
            if isinstance(value, pd.Timedelta):
                # Timedelta를 초 단위로 변환
                return value.total_seconds()
            
            # datetime.timedelta 객체 처리
            if isinstance(value, timedelta):
                return value.total_seconds()
            
            # 문자열인 경우 공백 제거
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
            
            return float(value)
            
        except (ValueError, TypeError) as e:
            log.debug(f"실수 변환 실패 '{value}': {e}")
            return None
    
    def _safe_datetime(self, value, session_start_time=None) -> Optional[datetime]:
        """값을 안전하게 datetime으로 변환"""
        if value is None:
            return None
            
        try:
            # pandas의 NaN이나 NA 체크
            if pd.isna(value):
                return None
            
            # 이미 datetime인 경우
            if isinstance(value, datetime):
                return value
            
            # timedelta인 경우 세션 시작 시간 기준으로 변환
            if isinstance(value, (pd.Timedelta, timedelta)):
                if session_start_time is None:
                    # 세션 시작 시간이 없으면 None 반환
                    return None
                return session_start_time + value
            
            # 문자열인 경우 파싱 시도
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None
                # ISO 형식 파싱 시도
                return datetime.fromisoformat(value)
                
            return None
            
        except (ValueError, TypeError) as e:
            log.debug(f"날짜시간 변환 실패 '{value}': {e}")
            return None
