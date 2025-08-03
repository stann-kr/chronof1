#!/usr/bin/env python3
"""ChronoF1 ETL 스크립트.

Fast-F1 데이터를 ChronoF1 스키마에 적재하는 ETL 스크립트입니다.

사용법:
    python chronof1_etl.py 2024          # 한 시즌
    python chronof1_etl.py 2022-2024     # 여러 시즌 범위
    python chronof1_etl.py 2023 5        # 특정 시즌의 특정 라운드
"""

import os
import sys
import logging
import argparse
import pandas as pd
from datetime import datetime
from typing import List, Optional, Tuple
from dotenv import load_dotenv

# 로컬 모듈 임포트
from db import PgDb
from f1_api import (
    fetch_season_info, fetch_season_schedule, fetch_event_data, 
    fetch_session_results, fetch_lap_data, 
    fetch_merged_telemetry, fetch_pit_stops,
    fetch_tyre_stints, fetch_weather_data,
    fetch_session_messages
)
from repositories import CommonRepository, LiveRepository

# 환경 변수 로드
# 프로젝트 루트의 .env 파일 로드
load_dotenv(os.path.join(os.path.dirname(__file__), '../../../../../.env'), override=True)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
)
log = logging.getLogger("chronof1.etl")


def etl_round(common_repo: CommonRepository, live_repo: LiveRepository, 
             year: int, round_num: int, session_type: str, telemetry: bool = False, force: bool = False) -> None:
    """특정 시즌의 특정 라운드 데이터를 적재합니다.
    
    Args:
        common_repo: 공통 저장소
        live_repo: 라이브 저장소
        year: 시즌 연도
        round_num: 라운드 번호
        session_type: 세션 유형 (R, Q 등)
        telemetry: 텔레메트리 데이터도 적재할지 여부
    """
    log.info(f"===== 시즌 {year} 라운드 {round_num} 세션 {session_type} ETL 시작 =====")

    # 세션이 이미 적재되었는지 확인
    session_id_check = common_repo.db.fetch_one(
        'SELECT id, results_fetched FROM "common_sessions" WHERE event_id = (SELECT id FROM "common_events" WHERE season_id = (SELECT id FROM "common_seasons" WHERE year = %s) AND round = %s) AND type = %s',
        year, round_num, session_type
    )

    if not force and session_id_check and session_id_check[1]: # results_fetched가 True이고 강제 모드가 아닌 경우
        log.info(f"시즌 {year} 라운드 {round_num} 세션 {session_type} 데이터는 이미 적재되었습니다. 건너뜁니다.")
        return
    
    # 1. 이벤트 메타데이터 가져오기
    event_data = fetch_event_data(year, round_num)
    
    # 2. 시즌 정보 가져오기 및 저장
    season_info = fetch_season_info(year)
    season_id = common_repo.upsert_season(
        year=year,
        name=season_info["name"],
        start_date=season_info["start_date"],
        end_date=season_info["end_date"]
    )
    
    # 3. 서킷 저장 (상세 정보 포함)
    circuit_id = common_repo.upsert_circuit(
        name=event_data["circuit_name"],
        short_name=event_data.get("circuit_short_name"),
        locality=event_data.get("circuit_locality"),
        country=event_data.get("country"),
        latitude=event_data.get("circuit_latitude"),
        longitude=event_data.get("circuit_longitude"),
        length=event_data.get("circuit_length"),
        turns=event_data.get("circuit_turns")
    )
    
    # 4. 이벤트 저장
    event_id = common_repo.upsert_event(
        season_id=season_id,
        circuit_id=circuit_id,
        round_num=event_data["round"],
        name=event_data["name"],
        short_name=event_data["short_name"], # 추가된 short_name
        event_start=event_data["event_start"],
        event_end=event_data["event_end"]
    )
    
    # 5. 라이브 이벤트 저장
    live_event_id = live_repo.upsert_live_event(
        common_event_id=event_id,
        season_id=season_id,
        circuit_id=circuit_id
    )
    
    # 6. 세션 결과 가져오기 (duration 정보를 얻기 위해 먼저 실행)
    driver_results, session_obj, session_duration = fetch_session_results(year, round_num, session_type)
    
    # 7. 세션 정보
    # FastF1의 세션 타입과 매핑
    session_name_map = {
        "FP1": "Practice 1",
        "FP2": "Practice 2",
        "FP3": "Practice 3",
        "Q": "Qualifying",
        "S": "Sprint",
        "SQ": "Sprint Qualifying",
        "R": "Race"
    }
    current_session_name = session_name_map.get(session_type, session_type)
    
    session_id = common_repo.upsert_session(
        event_id=event_id,
        session_type=session_type,
        name=current_session_name,
        date=event_data["event_date"], # FastF1은 이벤트 날짜를 세션 날짜로 사용
        duration=session_duration, # 추가된 duration
        results_fetched=False # 초기에는 false
    )
    
    # 8. 라이브 세션 저장
    live_session_id = live_repo.upsert_live_session(
        live_event_id=live_event_id,
        common_session_id=session_id,
        common_event_id=event_id
    )
    
    # 8.1 세션 상태와 트랙 상태 데이터 처리
    try:
        # 세션 시작 시간 계산 (경기 시간 추적을 위해)
        session_start_time = None
        if hasattr(session_obj, 'date') and session_obj.date is not None:
            session_start_time = session_obj.date
        
        # 세션 상태 데이터 저장
        if hasattr(session_obj, 'session_status') and session_obj.session_status is not None:
            live_repo.insert_session_status_data(session_id, session_obj.session_status, session_start_time)
        
        # 트랙 상태 데이터 저장  
        if hasattr(session_obj, 'track_status') and session_obj.track_status is not None:
            live_repo.insert_track_status_data(session_id, session_obj.track_status, session_start_time)
            
    except Exception as e:
        log.warning(f"세션/트랙 상태 데이터 처리 실패: {e}")
    
    # 9. 드라이버와 팀 데이터 처리
    for _, row in driver_results.iterrows():
        driver_number = int(row["DriverNumber"]) if pd.notna(row["DriverNumber"]) else None
        
        # 결과 정보
        position = int(row["Position"]) if pd.notna(row["Position"]) else None
        grid_position = int(row["GridPosition"]) if pd.notna(row["GridPosition"]) else None
        status = row.get("Status")
        points = float(row["Points"]) if pd.notna(row["Points"]) else 0.0
        
        # 9.1 드라이버 저장
        driver_id = common_repo.upsert_driver(
            code=row["Abbreviation"],
            number=driver_number,
            full_name=row["FullName"],
            dob=row["DateOfBirth"],
            nationality=row["Nationality"]
        )
        
        # 9.2 팀 저장
        team_id = common_repo.upsert_team(
            name=row["TeamName"],
            nationality=row["TeamNationality"],
            color=row["TeamColor"]
        )
        
        # 9.3 시즌-팀-드라이버 관계 저장
        common_repo.upsert_season_team_driver(
            season_id=season_id,
            team_id=team_id,
            driver_id=driver_id,
            driver_number=driver_number,
            is_primary=True,
            from_round=round_num  # 간단하게 현재 라운드부터 시작으로 설정
        )
        
        # 9.4 라이브 드라이버 세션 저장
        driver_session_id = live_repo.upsert_driver_session(
            session_id=live_session_id,
            driver_id=driver_id,
            team_id=team_id,
            car_number=driver_number if driver_number else 0,
            position=position,
            grid_position=grid_position,
            status=status,
            points=points
        )
        
        # 10. 랩 데이터 처리 (해당 드라이버의 모든 랩)
        if driver_number:
            try:
                laps_df = fetch_lap_data(session_obj, driver_number)
                
                for _, lap in laps_df.iterrows():
                    lap_number = lap.get("LapNumber")
                    if not pd.notna(lap_number):
                        continue
                    
                    lap_number = int(lap_number)
                    
                    # 기본 랩 시간 정보
                    lap_time = lap.get("LapTime").total_seconds() if pd.notna(lap.get("LapTime")) else None
                    lap_time_str = str(lap.get("LapTime")) if pd.notna(lap.get("LapTime")) else None
                    
                    # 섹터 시간
                    sector1 = lap.get("Sector1Time").total_seconds() if pd.notna(lap.get("Sector1Time")) else None
                    sector2 = lap.get("Sector2Time").total_seconds() if pd.notna(lap.get("Sector2Time")) else None
                    sector3 = lap.get("Sector3Time").total_seconds() if pd.notna(lap.get("Sector3Time")) else None
                    
                    # 세션 시간 데이터 (FastF1 추가 필드)
                    def safe_convert_to_datetime(value):
                        """Timedelta나 Timestamp를 안전하게 datetime으로 변환"""
                        if pd.isna(value):
                            return None
                        if hasattr(value, 'to_pydatetime'):
                            return value.to_pydatetime()
                        elif hasattr(value, 'total_seconds') and session_start_time:
                            # Timedelta의 경우 세션 시작 시간에 더해서 경기 시간으로 변환
                            from datetime import timedelta
                            return session_start_time + timedelta(seconds=value.total_seconds())
                        else:
                            return value
                    
                    def safe_convert_to_seconds(value):
                        """Timedelta를 안전하게 초로 변환"""
                        if pd.isna(value):
                            return None
                        if hasattr(value, 'total_seconds'):
                            return value.total_seconds()
                        return value
                    
                    lap_start_time = safe_convert_to_datetime(lap.get("LapStartTime"))
                    lap_start_date = safe_convert_to_datetime(lap.get("LapStartDate"))
                    sector1_session_time = safe_convert_to_seconds(lap.get("Sector1SessionTime"))
                    sector2_session_time = safe_convert_to_seconds(lap.get("Sector2SessionTime"))
                    sector3_session_time = safe_convert_to_seconds(lap.get("Sector3SessionTime"))
                    
                    # 피트 시간 정보
                    pit_in_time = safe_convert_to_datetime(lap.get("PitInTime"))
                    pit_out_time = safe_convert_to_datetime(lap.get("PitOutTime"))
                    pit_in = bool(pit_in_time) if pit_in_time else None
                    pit_out = bool(pit_out_time) if pit_out_time else None
                    
                    # 속도 트랩 데이터
                    speed_i1 = float(lap.get("SpeedI1")) if pd.notna(lap.get("SpeedI1")) else None
                    speed_i2 = float(lap.get("SpeedI2")) if pd.notna(lap.get("SpeedI2")) else None
                    speed_fl = float(lap.get("SpeedFL")) if pd.notna(lap.get("SpeedFL")) else None
                    speed_st = float(lap.get("SpeedST")) if pd.notna(lap.get("SpeedST")) else None
                    
                    # 타이어 관련 데이터
                    compound = lap.get("Compound", None)
                    tyre_life = int(lap.get("TyreLife")) if pd.notna(lap.get("TyreLife")) else None
                    fresh_tyre = bool(lap.get("FreshTyre")) if pd.notna(lap.get("FreshTyre")) else None
                    
                    # 상태 및 유효성 데이터
                    is_personal_best = bool(lap.get("IsPersonalBest")) if pd.notna(lap.get("IsPersonalBest")) else None
                    is_valid = bool(lap.get("IsValid")) if pd.notna(lap.get("IsValid")) else None
                    is_accurate = bool(lap.get("IsAccurate")) if pd.notna(lap.get("IsAccurate")) else None
                    track_status = str(lap.get("TrackStatus")) if pd.notna(lap.get("TrackStatus")) else None
                    deleted = bool(lap.get("Deleted")) if pd.notna(lap.get("Deleted")) else None
                    deleted_reason = str(lap.get("DeletedReason")) if pd.notna(lap.get("DeletedReason")) else None
                    fast_f1_generated = bool(lap.get("FastF1Generated")) if pd.notna(lap.get("FastF1Generated")) else None
                    
                    # 포지션 정보
                    position = int(lap.get("Position")) if pd.notna(lap.get("Position")) else None
                    
                    # 10.1 랩 정보 저장 (확장된 필드 포함)
                    live_repo.upsert_lap(
                        driver_session_id=driver_session_id,
                        lap_number=lap_number,
                        lap_time=lap_time,
                        lap_time_string=lap_time_str,
                        sector1_time=sector1,
                        sector2_time=sector2,
                        sector3_time=sector3,
                        is_personal_best=is_personal_best,
                        is_valid=is_valid,
                        tyre_compound=compound,
                        pit_in=pit_in,
                        pit_out=pit_out,
                        position=position,
                        # 새로운 FastF1 필드들
                        lap_start_time=lap_start_time,
                        lap_start_date=lap_start_date,
                        sector1_session_time=sector1_session_time,
                        sector2_session_time=sector2_session_time,
                        sector3_session_time=sector3_session_time,
                        pit_in_time=pit_in_time,
                        pit_out_time=pit_out_time,
                        speed_i1=speed_i1,
                        speed_i2=speed_i2,
                        speed_fl=speed_fl,
                        speed_st=speed_st,
                        tyre_life=tyre_life,
                        fresh_tyre=fresh_tyre,
                        is_accurate=is_accurate,
                        track_status=track_status,
                        deleted=deleted,
                        deleted_reason=deleted_reason,
                        fast_f1_generated=fast_f1_generated
                    )
                    
                    if telemetry:
                        try:
                            # 통합 텔레메트리 데이터 가져오기
                            merged_telemetry_df = fetch_merged_telemetry(lap)
                            if not merged_telemetry_df.empty:
                                # 텔레메트리 데이터와 위치 데이터를 한 번에 저장
                                live_repo.insert_telemetry_data(driver_session_id, merged_telemetry_df, session_start_time)
                                live_repo.insert_position_data(driver_session_id, merged_telemetry_df, session_start_time)
                                
                        except Exception as e:
                            log.warning(f"통합 텔레메트리 데이터 가져오기 실패 (드라이버: {driver_code}, 랩: {lap_number}): {e}")
                
                # 텔레메트리와 위치 데이터가 분리되어 각각의 테이블에 저장됨
                
                # 텔레메트리와 위치 데이터가 분리되어 각각의 테이블에 저장됨
                
            except Exception as e:
                log.warning(f"랩 데이터 가져오기 실패 (드라이버: {driver_code}): {e}")
    
    # 11. 세션 레벨 추가 데이터 처리
    try:
        # 11.1 피트스톱 데이터 처리
        log.info("피트스톱 데이터 수집 중...")
        pit_stops_df = fetch_pit_stops(session_obj)
        if not pit_stops_df.empty:
            # 각 드라이버별로 피트스톱 데이터 저장
            for _, pit_stop in pit_stops_df.iterrows():
                driver_number = pit_stop["DriverNumber"]
                if pd.notna(driver_number):
                    # 해당 드라이버의 driver_session_id 찾기
                    driver_session = live_repo.db.fetch_one(
                        '''SELECT lds.id FROM "live_driver_sessions" lds
                           JOIN "common_drivers" cd ON lds.driver_id = cd.id
                           WHERE lds.session_id = %s AND cd.number = %s''',
                        live_session_id, int(driver_number)
                    )
                    if driver_session:
                        # pandas Series를 dict로 변환하여 DataFrame 생성
                        single_pit_df = pd.DataFrame([pit_stop.to_dict()])
                        # driver_session이 tuple이면 첫 번째 요소를 사용
                        driver_session_id = driver_session[0] if isinstance(driver_session, tuple) else driver_session['id']
                        live_repo.insert_pit_stop_data(driver_session_id, single_pit_df)
        
        # 11.2 타이어 스틴트 데이터 처리
        log.info("타이어 스틴트 데이터 수집 중...")
        stints_df = fetch_tyre_stints(session_obj)
        if not stints_df.empty:
            # 각 드라이버별로 스틴트 데이터 저장
            for driver_number in stints_df["DriverNumber"].unique():
                if pd.notna(driver_number):
                    # 해당 드라이버의 driver_session_id 찾기
                    driver_session = live_repo.db.fetch_one(
                        '''SELECT lds.id FROM "live_driver_sessions" lds
                           JOIN "common_drivers" cd ON lds.driver_id = cd.id
                           WHERE lds.session_id = %s AND cd.number = %s''',
                        live_session_id, int(driver_number)
                    )
                    if driver_session:
                        driver_stints = stints_df[stints_df["DriverNumber"] == driver_number]
                        # driver_session이 tuple이면 첫 번째 요소를 사용
                        driver_session_id = driver_session[0] if isinstance(driver_session, tuple) else driver_session['id']
                        live_repo.insert_tyre_stint_data(driver_session_id, driver_stints)
        
        # 11.3 날씨 데이터 처리
        log.info("날씨 데이터 수집 중...")
        weather_df = fetch_weather_data(session_obj)
        if not weather_df.empty:
            live_repo.insert_weather_data(session_id, weather_df, session_start_time)
        
        # 11.4 세션 메시지 데이터 처리
        log.info("세션 메시지 데이터 수집 중...")
        messages_df = fetch_session_messages(session_obj)
        if not messages_df.empty:
            live_repo.insert_session_messages(session_id, messages_df, session_start_time)
        
    except Exception as e:
        import traceback
        log.warning(f"추가 세션 데이터 처리 실패: {e}")
        log.warning(f"스택 트레이스: {traceback.format_exc()}")
    
    log.info(f"===== 시즌 {year} 라운드 {round_num} 세션 {session_type} ETL 완료 =====")
    common_repo.update_session_results_fetched_status(session_id, True)


def etl_season(common_repo: CommonRepository, live_repo: LiveRepository, 
              year: int, rounds: Optional[List[int]] = None, 
              telemetry: bool = False) -> None:
    """특정 시즌의 데이터를 적재합니다.
    
    Args:
        common_repo: 공통 저장소
        live_repo: 라이브 저장소
        year: 시즌 연도
        rounds: 처리할 라운드 번호 리스트 (None이면 모든 라운드)
        telemetry: 텔레메트리 데이터도 적재할지 여부
    """
    log.info(f"===== 시즌 {year} ETL 시작 =====")
    
    # 시즌 일정 가져오기
    schedule = fetch_season_schedule(year)
    
    # 테스트 세션 제외
    schedule = schedule[schedule["EventFormat"] != "Testing"]
    
    # 처리할 라운드 결정
    if rounds:
        # 특정 라운드만 처리
        round_numbers = [r for r in rounds if r in schedule["RoundNumber"].values]
    else:
        # 모든 라운드 처리
        round_numbers = schedule["RoundNumber"].values
    
    # 시즌 저장
    season_id = common_repo.upsert_season(year)
    log.info(f"시즌 {year} 저장됨 (ID: {season_id})")
    
    # 처리할 세션 타입 정의 (퀄리파잉, 레이스)
    session_types_to_process = ["Q", "R"]

    # 각 라운드 처리
    for round_num in round_numbers:
        for session_type in session_types_to_process:
            try:
                etl_round(common_repo, live_repo, year, int(round_num), session_type, telemetry)
            except Exception as e:
                log.error(f"라운드 {round_num} 세션 {session_type} 처리 중 오류 발생: {e}")
    
    log.info(f"===== 시즌 {year} ETL 완료 =====")


def main() -> None:
    """ETL 스크립트 메인 함수."""
    parser = argparse.ArgumentParser(description="ChronoF1 ETL 스크립트")
    parser.add_argument("season", help="시즌 연도 (예: 2024 또는 2022-2024)")
    parser.add_argument("round", nargs="?", type=int, help="특정 라운드 번호 (선택사항)")
    parser.add_argument("--session-type", type=str, help="처리할 세션 유형 (예: R, Q, FP1 등). 특정 라운드와 함께 사용.")
    parser.add_argument("--telemetry", action="store_true", help="텔레메트리 데이터도 적재")
    parser.add_argument("--force", action="store_true", help="이미 적재된 데이터도 강제로 다시 적재")
    args = parser.parse_args()
    
    # 시즌 범위 파싱
    if "-" in args.season:
        start, end = map(int, args.season.split("-"))
        years = range(start, end + 1)
    else:
        years = [int(args.season)]
    
    # 데이터베이스 연결
    db = PgDb()
    common_repo = CommonRepository(db)
    live_repo = LiveRepository(db)
    
    try:
        if args.round:
            # 특정 시즌의 특정 라운드만 처리
            if args.session_type:
                etl_round(common_repo, live_repo, years[0], args.round, args.session_type, args.telemetry, args.force)
            else:
                # 세션 타입이 지정되지 않은 경우, 기본적으로 Q와 R을 처리
                session_types_to_process = ["Q", "R"]
                for session_type in session_types_to_process:
                    etl_round(common_repo, live_repo, years[0], args.round, session_type, args.telemetry, args.force)
        else:
            # 전체 시즌 처리
            for year in years:
                etl_season(common_repo, live_repo, year, telemetry=args.telemetry, force=args.force)
    except Exception as e:
        log.error(f"ETL 처리 중 오류 발생: {e}")
    finally:
        db.close()
        log.info("🎉 ETL 처리 완료")


if __name__ == "__main__":
    # pandas 임포트
    import pandas as pd
    
    main()
