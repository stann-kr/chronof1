"""
FastF1 API 래퍼 모듈

FastF1 라이브러리를 사용하여 F1 데이터를 가져오는 함수들을 제공합니다.
이 모듈은 FastF1의 복잡한 API를 단순화하고 일관된 데이터 형식을 제공합니다.

Note: 
    - FastF1 캐시는 core.config에서 설정된 경로를 사용합니다.
    - 브레이크 데이터는 Boolean 타입으로 제공됩니다 (True=눌림, False=안눌림).
"""

import fastf1
import pandas as pd
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any

from circuit_data import get_circuit_info, get_season_dates
from core.config import ETLConfig

log = logging.getLogger(__name__)

# ETL 설정 로드 및 FastF1 캐시 설정
config = ETLConfig()
if config.enable_cache:
    fastf1.Cache.enable_cache(config.cache_path)
    log.info(f"FastF1 캐시 활성화: {config.cache_path}")
else:
    log.warning("FastF1 캐시 비활성화됨")

def fetch_season_info(year: int) -> Dict:
    """특정 시즌의 정보를 가져옵니다.
    
    Args:
        year: 시즌 연도
        
    Returns:
        시즌 정보 사전
    """
    try:
        log.info(f"{year} 시즌 정보 가져오는 중...")
        schedule = fetch_season_schedule(year)
        
        if len(schedule) == 0:
            raise ValueError(f"{year} 시즌 데이터가 없습니다.")
        
        # 실제 레이스 이벤트들만 필터링 (테스트 제외)
        race_events = schedule[schedule["EventFormat"] != "testing"]
        
        if len(race_events) > 0:
            # 첫 번째와 마지막 레이스 날짜
            first_race = race_events.iloc[0]
            last_race = race_events.iloc[-1]
            
            # 시즌 시작일은 첫 번째 레이스 2일 전 (연습 세션 시작)
            season_start = first_race["EventDate"].to_pydatetime() - timedelta(days=2)
            # 시즌 종료일은 마지막 레이스 날짜
            season_end = last_race["EventDate"].to_pydatetime()
        else:
            # 레이스가 없으면 대략적인 날짜 사용
            start_dates, end_dates = get_season_dates(year)
            season_start = datetime(year, start_dates[0], start_dates[1])
            season_end = datetime(year, end_dates[0], end_dates[1])
        
        return {
            "year": year,
            "name": f"FIA Formula One World Championship {year}",
            "start_date": season_start,
            "end_date": season_end,
            "total_events": len(schedule),
            "race_events": len(race_events)
        }
        
    except Exception as e:
        log.error(f"{year} 시즌 정보 가져오기 실패: {e}")
        # 기본값 반환
        start_dates, end_dates = get_season_dates(year)
        return {
            "year": year,
            "name": f"FIA Formula One World Championship {year}",
            "start_date": datetime(year, start_dates[0], start_dates[1]),
            "end_date": datetime(year, end_dates[0], end_dates[1]),
            "total_events": 0,
            "race_events": 0
        }

def fetch_season_schedule(year: int) -> pd.DataFrame:
    """특정 시즌의 경기 일정을 가져옵니다.
    
    Args:
        year: 시즌 연도
        
    Returns:
        경기 일정 데이터프레임
    """
    try:
        log.info(f"{year} 시즌 일정 가져오는 중...")
        schedule = fastf1.get_event_schedule(year)
        log.info(f"{year} 시즌 일정 가져오기 완료 ({len(schedule)} 이벤트)")
        return schedule
    except Exception as e:
        log.error(f"{year} 시즌 일정 가져오기 실패: {e}")
        raise

def fetch_event_data(year: int, round_num: int, event_format: str = None) -> Dict:
    """특정 이벤트(그랑프리)의 기본 정보를 가져옵니다.
    
    Args:
        year: 시즌 연도
        round_num: 라운드 번호
        event_format: 이벤트 형식 (기본값: None = 모든 형식)
        
    Returns:
        이벤트 정보 사전
    """
    schedule = fetch_season_schedule(year)
    
    if event_format:
        schedule = schedule[schedule["EventFormat"] == event_format]
    
    event_row = schedule[schedule["RoundNumber"] == round_num]
    if len(event_row) == 0:
        raise ValueError(f"{year} 시즌 라운드 {round_num}을 찾을 수 없습니다.")
    
    row = event_row.iloc[0]
    
    # 이벤트 시작일과 종료일 계산 (F1 이벤트는 보통 금-일 3일간 진행)
    event_date = row["EventDate"].to_pydatetime()
    event_start = event_date - timedelta(days=2)  # 금요일부터 시작
    event_end = event_date  # 일요일 종료
    
    # 서킷 추가 정보 가져오기
    circuit_info = get_circuit_info(row["Location"])
    
    # 이벤트 이름에서 shortName 추출 (예: 'Bahrain Grand Prix' -> 'Bahrain GP')
    event_name = row["EventName"]
    event_short_name = None
    if "Grand Prix" in event_name:
        event_short_name = event_name.replace("Grand Prix", "GP").strip()
    elif "Test" in event_name:
        event_short_name = event_name.replace("Test", "Testing").strip()
    else:
        event_short_name = event_name # 기본값으로 전체 이름 사용

    return {
        "year": year,
        "round": int(row["RoundNumber"]),
        "name": event_name,
        "short_name": event_short_name, # 추가된 short_name
        "circuit_name": row["Location"],
        "country": row.get("Country", None),
        "event_date": event_date,
        "event_start": event_start,
        "event_end": event_end,
        "format": row.get("EventFormat", None),
        # 서킷 상세 정보 추가
        "circuit_short_name": circuit_info.get("short_name") if circuit_info else None,
        "circuit_locality": circuit_info.get("locality") if circuit_info else None,
        "circuit_latitude": circuit_info.get("latitude") if circuit_info else None,
        "circuit_longitude": circuit_info.get("longitude") if circuit_info else None,
        "circuit_length": circuit_info.get("length") if circuit_info else None,
        "circuit_turns": circuit_info.get("turns") if circuit_info else None
    }

def fetch_session_results(year: int, round_num: int, session_type: str = "R") -> Tuple[pd.DataFrame, Any, Optional[int]]:
    """특정 세션의 결과를 가져옵니다.
    
    Args:
        year: 시즌 연도
        round_num: 라운드 번호
        session_type: 세션 유형 (기본값: "R" = 레이스)
            - "FP1", "FP2", "FP3": 자유 연습 세션
            - "Q", "Q1", "Q2", "Q3": 예선
            - "S": 스프린트
            - "SQ": 스프린트 예선
            - "R": 레이스
            
    Returns:
        (드라이버 결과 데이터프레임, 세션 객체, 세션 지속시간(분)) 튜플
    """
    try:
        log.info(f"{year} R{round_num} {session_type} 세션 데이터 로드 중...")
        session = fastf1.get_session(year, round_num, session_type)
        session.load()
        log.info(f"{year} R{round_num} {session_type} 세션 데이터 로드 완료")
        
        # 결과 데이터프레임 정리
        results = session.results
        
        # 필요한 열만 선택
        needed_columns = [
            "DriverNumber", "Abbreviation", "FullName", "TeamName",
            "Position", "GridPosition", "Q1", "Q2", "Q3", "Time", 
            "Status", "Points", "FastestLap", "FastestLapTime"
        ]
        
        # 존재하는 열만 포함
        existing_columns = [col for col in needed_columns if col in results.columns]
        
        # 드라이버 결과 데이터 추출
        driver_results = results[existing_columns].copy()
        
        # 일부 열이 누락된 경우 기본값 설정
        for col in set(needed_columns) - set(existing_columns):
            driver_results[col] = None
        
        # 세션 지속 시간 계산 (분 단위)
        session_duration_minutes = None
        try:
            # FastF1 세션 객체에서 지속시간을 추정
            # 세션 타입별 기본 지속시간 설정 (분)
            default_durations = {
                "FP1": 90,
                "FP2": 90, 
                "FP3": 60,
                "Q": 60,
                "SQ": 30,
                "S": 30,
                "R": 120
            }
            
            # 실제 세션 데이터에서 지속시간을 추정해보기
            if hasattr(session, 'session_duration') and session.session_duration:
                session_duration_minutes = int(session.session_duration.total_seconds() / 60)
            elif hasattr(session, 'date') and hasattr(session, 'end'):
                # 시작시간과 종료시간이 있는 경우
                start_time = session.date
                end_time = session.end
                if start_time and end_time:
                    duration = end_time - start_time
                    session_duration_minutes = int(duration.total_seconds() / 60)
            else:
                # 기본값 사용
                session_duration_minutes = default_durations.get(session_type, 90)
                
        except Exception as e:
            log.warning(f"세션 지속시간 계산 실패, 기본값 사용: {e}")
            default_durations = {
                "FP1": 90, "FP2": 90, "FP3": 60,
                "Q": 60, "SQ": 30, "S": 30, "R": 120
            }
            session_duration_minutes = default_durations.get(session_type, 90)

        # 드라이버 결과 데이터프레임에 추가 정보 병합
        # FastF1의 Driver 객체에서 Nationality와 DateOfBirth를 가져옵니다.
        # Team 객체에서 TeamNationality와 TeamColor를 가져옵니다.
        driver_info_list = []
        for _, row in results.iterrows():
            try:
                driver_data = {
                    "DriverNumber": row.get("DriverNumber"),
                    "Abbreviation": row.get("Abbreviation"),
                    "FullName": row.get("FullName"),
                    "TeamName": row.get("TeamName"),
                    "Position": row.get("Position"),
                    "GridPosition": row.get("GridPosition"),
                    "Status": row.get("Status"),
                    "Points": row.get("Points"),
                    "Nationality": None,
                    "DateOfBirth": None,
                    "TeamNationality": None,
                    "TeamColor": None,
                }
                
                # Driver 정보 안전하게 가져오기
                if "Driver" in row and pd.notna(row["Driver"]):
                    try:
                        driver_obj = row["Driver"]
                        if hasattr(driver_obj, 'Nationality'):
                            driver_data["Nationality"] = driver_obj.Nationality
                        if hasattr(driver_obj, 'DateOfBirth') and pd.notna(driver_obj.DateOfBirth):
                            driver_data["DateOfBirth"] = driver_obj.DateOfBirth.to_pydatetime()
                    except Exception as e:
                        log.warning(f"드라이버 정보 가져오기 실패 ({row.get('DriverNumber', 'Unknown')}): {e}")
                
                # Team 정보 안전하게 가져오기  
                if "Team" in row and pd.notna(row["Team"]):
                    try:
                        team_obj = row["Team"]
                        if hasattr(team_obj, 'TeamNationality'):
                            driver_data["TeamNationality"] = team_obj.TeamNationality
                        if hasattr(team_obj, 'TeamColor'):
                            driver_data["TeamColor"] = team_obj.TeamColor
                    except Exception as e:
                        log.warning(f"팀 정보 가져오기 실패 ({row.get('TeamName', 'Unknown')}): {e}")
                        
                driver_info_list.append(driver_data)
                
            except Exception as e:
                log.error(f"드라이버 행 처리 실패: {e}")
                # 기본 정보만으로 진행
                driver_data = {col: row.get(col) for col in existing_columns}
                driver_info_list.append(driver_data)
        
        # 기존 driver_results에 새로운 정보 병합
        # 기존 driver_results의 인덱스를 유지하면서 병합
        driver_results = pd.DataFrame(driver_info_list).set_index(driver_results.index)
        
        return driver_results, session, session_duration_minutes
    
    except Exception as e:
        log.error(f"{year} R{round_num} {session_type} 세션 데이터 로드 실패: {e}")
        raise

def fetch_lap_data(session, driver_number: int = None) -> pd.DataFrame:
    """세션의 랩 데이터를 가져옵니다.
    
    Args:
        session: FastF1 세션 객체
        driver_number: 특정 드라이버의 랩만 가져올 경우 드라이버 번호
            
    Returns:
        랩 데이터 데이터프레임
    """
    try:
        if driver_number:
            log.info(f"드라이버 {driver_number}의 랩 데이터 가져오는 중...")
            # pick_driver 대신 pick_drivers 사용
            laps = session.laps.pick_drivers(driver_number)
        else:
            log.info(f"모든 드라이버의 랩 데이터 가져오는 중...")
            laps = session.laps
        
        log.info(f"랩 데이터 가져오기 완료 ({len(laps)} 랩)")
        return laps
    
    except Exception as e:
        log.error(f"랩 데이터 가져오기 실패: {e}")
        raise

def fetch_merged_telemetry(lap) -> pd.DataFrame:
    """특정 랩의 통합된 텔레메트리 데이터를 가져옵니다.
    
    Args:
        lap: FastF1 랩 시리즈 객체
            
    Returns:
        통합 텔레메트리 데이터프레임
    """
    try:
        # get_telemetry()는 차량, 위치, 계산된 데이터를 모두 포함합니다.
        telemetry = lap.get_telemetry()
        # 랩 번호를 모든 행에 추가
        if not telemetry.empty:
            telemetry['LapNumber'] = lap['LapNumber']
            
            # Boolean 타입 그대로 유지 (테스트를 위해 변환 제거)
            log.debug(f"brake 데이터 타입 유지: {telemetry['Brake'].dtype}")
            
            # FastF1 v3.6.0에서는 DriverAhead와 DistanceToDriverAhead 컬럼이 기본적으로 포함됩니다.
            # 필요한 경우에만 add_driver_ahead()를 호출합니다.
            if 'DriverAhead' not in telemetry.columns or 'DistanceToDriverAhead' not in telemetry.columns:
                try:
                    telemetry.add_driver_ahead()
                    log.debug("DriverAhead 및 DistanceToDriverAhead 컬럼 추가 완료")
                except Exception as e:
                    log.warning(f"add_driver_ahead() 실패: {e}")
            else:
                log.debug("DriverAhead 및 DistanceToDriverAhead 컬럼이 이미 존재함")
        return telemetry
    except Exception as e:
        driver = lap.get("Driver")
        lap_num = lap.get("LapNumber")
        log.error(f"드라이버 {driver}의 랩 {lap_num} 통합 텔레메트리 가져오기 실패: {e}")
        return pd.DataFrame()

def fetch_driver_info(year: int) -> pd.DataFrame:
    """특정 시즌의 모든 드라이버 정보를 가져옵니다.
    
    Args:
        year: 시즌 연도
            
    Returns:
        드라이버 정보 데이터프레임
    """
    try:
        log.info(f"{year} 시즌 드라이버 정보 가져오는 중...")
        schedule = fetch_season_schedule(year)
        
        # 첫 번째 레이스 이벤트 찾기
        race_events = schedule[schedule["EventFormat"] != "Testing"]
        if len(race_events) == 0:
            raise ValueError(f"{year} 시즌에 레이스 이벤트가 없습니다.")
        
        first_race = race_events.iloc[0]
        round_num = first_race["RoundNumber"]
        
        # 첫 번째 레이스의 결과에서 드라이버 정보 추출
        driver_results, _ = fetch_session_results(year, round_num)
        
        # 필요한 열만 선택하여 드라이버 정보 생성
        drivers = driver_results[["DriverNumber", "Abbreviation", "FullName", "TeamName"]].copy()
        drivers["Year"] = year
        
        log.info(f"{year} 시즌 드라이버 정보 가져오기 완료 ({len(drivers)} 드라이버)")
        return drivers
    
    except Exception as e:
        log.error(f"{year} 시즌 드라이버 정보 가져오기 실패: {e}")
        raise


def fetch_pit_stops(session) -> pd.DataFrame:
    """세션의 피트스톱 데이터를 가져옵니다.
    
    Args:
        session: FastF1 세션 객체
            
    Returns:
        피트스톱 데이터 데이터프레임
    """
    try:
        log.info("피트스톱 데이터 가져오는 중...")
        
        # 모든 랩에서 피트스톱이 발생한 랩만 필터링
        pit_laps = session.laps[session.laps['PitOutTime'].notna()].copy()
        
        if pit_laps.empty:
            log.info("피트스톱 데이터가 없습니다.")
            return pd.DataFrame()

        # 드라이버 번호 매핑
        driver_map = {row['Abbreviation']: row['DriverNumber'] for _, row in session.results.iterrows()}
        pit_laps['DriverNumber'] = pit_laps['Driver'].map(driver_map)

        # 필요한 컬럼만 선택하여 반환
        pit_stops_df = pit_laps[[
            'DriverNumber', 'Driver', 'LapNumber', 
            'PitInTime', 'PitOutTime'
        ]].copy()

        # 피트스톱 시간 계산 (PitOutTime - PitInTime)
        pit_stops_df['PitTime'] = pit_stops_df['PitOutTime'] - pit_stops_df['PitInTime']

        log.info(f"피트스톱 데이터 가져오기 완료 ({len(pit_stops_df)} 피트스톱)")
        return pit_stops_df
    
    except Exception as e:
        log.error(f"피트스톱 데이터 가져오기 실패: {e}")
        return pd.DataFrame()


def fetch_tyre_stints(session) -> pd.DataFrame:
    """세션의 타이어 스틴트 데이터를 가져옵니다.
    
    Args:
        session: FastF1 세션 객체
            
    Returns:
        타이어 스틴트 데이터 데이터프레임
    """
    try:
        log.info("타이어 스틴트 데이터 가져오는 중...")
        laps = session.laps
        
        # 각 랩의 컴파운드가 이전 랩과 다른 경우를 찾아서 스틴트의 시작으로 표시
        laps['Stint'] = (laps['Compound'] != laps['Compound'].shift()).cumsum()
        
        # 드라이버별, 스틴트별로 그룹화하여 스틴트 정보 계산
        stints = laps.groupby(['Driver', 'Stint']).agg(
            Compound=('Compound', 'first'),
            StartLap=('LapNumber', 'min'),
            EndLap=('LapNumber', 'max')
        ).reset_index()

        # 스틴트별 랩 수 계산
        stints['Laps'] = stints['EndLap'] - stints['StartLap'] + 1

        # 드라이버 번호 매핑
        driver_map = {row['Abbreviation']: row['DriverNumber'] for _, row in session.results.iterrows()}
        stints['DriverNumber'] = stints['Driver'].map(driver_map)

        # Stint 컬럼 이름을 StintNumber로 변경
        stints.rename(columns={'Stint': 'StintNumber'}, inplace=True)

        log.info(f"타이어 스틴트 데이터 가져오기 완료 ({len(stints)} 스틴트)")
        return stints
    
    except Exception as e:
        log.error(f"타이어 스틴트 데이터 가져오기 실패: {e}")
        return pd.DataFrame()


def fetch_weather_data(session) -> pd.DataFrame:
    """세션의 날씨 데이터를 가져옵니다.
    
    Args:
        session: FastF1 세션 객체
            
    Returns:
        날씨 데이터 데이터프레임
    """
    try:
        log.info("날씨 데이터 가져오는 중...")
        
        # FastF1에서 날씨 데이터 가져오기
        weather_data = session.weather_data
        
        if weather_data is not None and not weather_data.empty:
            log.info(f"날씨 데이터 가져오기 완료 ({len(weather_data)} 레코드)")
            return weather_data
        else:
            log.warning("날씨 데이터가 없습니다.")
            return pd.DataFrame()
    
    except Exception as e:
        log.error(f"날씨 데이터 가져오기 실패: {e}")
        return pd.DataFrame()
#     텔레메트리 데이터에서 X, Y, Z 좌표를 함께 수집합니다.
#     """
#     pass


def fetch_session_messages(session) -> pd.DataFrame:
    """세션의 메시지 데이터를 가져옵니다.
    
    FastF1의 session.race_control_messages 또는 session.messages를 통해
    레이스 컨트롤 메시지(안전차, 깃발 상태 등)를 수집합니다.
    
    Args:
        session: FastF1 세션 객체
        
    Returns:
        메시지 데이터 데이터프레임 (시간, 분류, 메시지 등 포함)
    """
    try:
        messages_data = pd.DataFrame()
        
        # 레이스 컨트롤 메시지 수집
        if hasattr(session, 'race_control_messages') and session.race_control_messages is not None:
            log.info("레이스 컨트롤 메시지 수집 중...")
            messages_data = session.race_control_messages
            log.info(f"레이스 컨트롤 메시지 {len(messages_data)}개 수집됨")
        
        # 일반 메시지가 있는 경우도 처리
        elif hasattr(session, 'messages') and session.messages is not None:
            log.info("세션 메시지 수집 중...")
            messages_data = session.messages
            log.info(f"세션 메시지 {len(messages_data)}개 수집됨")
        
        else:
            log.warning("메시지 데이터가 없습니다.")
            return pd.DataFrame()
        
        if not messages_data.empty:
            # 메시지 데이터 구조 확인 및 정리
            log.info(f"메시지 데이터 컬럼: {list(messages_data.columns)}")
            return messages_data
        else:
            log.warning("메시지 데이터가 비어있습니다.")
            return pd.DataFrame()
    
    except Exception as e:
        log.error(f"세션 메시지 데이터 가져오기 실패: {e}")
        return pd.DataFrame()
