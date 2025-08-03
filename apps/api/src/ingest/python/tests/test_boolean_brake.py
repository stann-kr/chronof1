#!/usr/bin/env python3
"""
Boolean 타입으로 brake 데이터 저장 테스트
원래 Boolean 스키마에서 왜 저장이 안되었는지 확인
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import fastf1
import pandas as pd
import logging
from f1_api import fetch_merged_telemetry
from repositories import TelemetryRepository
from db import get_db_connection

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)
log = logging.getLogger(__name__)

# FastF1 캐시 활성화
fastf1.Cache.enable_cache("../../../../../cache")

def test_boolean_brake_storage():
    """Boolean brake 데이터 저장 테스트"""
    
    try:
        # 2023 바레인 GP 레이스 세션 로드
        log.info("2023 바레인 GP 레이스 세션 로드 중...")
        session = fastf1.get_session(2023, 1, 'R')
        session.load()
        
        # 첫 번째 랩의 텔레메트리 데이터 가져오기
        laps = session.laps
        first_lap = laps.iloc[0]
        driver_num = first_lap['DriverNumber']
        lap_num = first_lap['LapNumber']
        
        log.info(f"드라이버 {driver_num}의 랩 {lap_num} 텔레메트리 테스트 중...")
        
        # 원본 FastF1 텔레메트리 (Boolean)
        original_telemetry = first_lap.get_telemetry()
        
        # 샘플 데이터 확인 (첫 5행만)
        sample_data = original_telemetry.head(5)
        
        log.info("=== 원본 텔레메트리 데이터 (Boolean) ===")
        log.info(f"brake 컬럼 타입: {original_telemetry['Brake'].dtype}")
        log.info(f"brake 값 샘플:\n{sample_data[['Time', 'Speed', 'Brake', 'Throttle']]}")
        
        # 이제 실제 데이터베이스 저장 시도
        db = get_db_connection()
        repo = TelemetryRepository(db)
        
        # 가상의 driver_session_id 사용 (실제로는 ETL에서 생성됨)
        test_driver_session_id = 999  # 테스트용 ID
        
        # 샘플 텔레메트리 데이터를 하나씩 저장 시도
        for idx, row in sample_data.iterrows():
            try:
                telemetry_data = {
                    'driver_session_id': test_driver_session_id,
                    'timestamp': row.get('Date', pd.Timestamp.now()),
                    'lap_number': lap_num,
                    'session_time': float(row.get('SessionTime', 0)) if pd.notna(row.get('SessionTime', 0)) else None,
                    'speed': float(row.get('Speed', 0)) if pd.notna(row.get('Speed', 0)) else None,
                    'rpm': float(row.get('RPM', 0)) if pd.notna(row.get('RPM', 0)) else None,
                    'throttle': float(row.get('Throttle', 0)) if pd.notna(row.get('Throttle', 0)) else None,
                    'brake': row.get('Brake'),  # Boolean 값 그대로
                    'drs': int(row.get('DRS', 0)) if pd.notna(row.get('DRS', 0)) else None,
                }
                
                log.info(f"저장 시도 - brake 값: {telemetry_data['brake']} (타입: {type(telemetry_data['brake'])})")
                
                # 실제 저장 시도
                result = repo.upsert_telemetry_data(telemetry_data)
                log.info(f"저장 성공: {result}")
                break  # 첫 번째만 테스트
                
            except Exception as e:
                log.error(f"텔레메트리 데이터 저장 실패: {e}")
                log.error(f"문제된 데이터: brake={telemetry_data['brake']}, 타입={type(telemetry_data['brake'])}")
                return False
                
        return True
        
    except Exception as e:
        log.error(f"테스트 실패: {e}")
        return False

if __name__ == "__main__":
    log.info("Boolean brake 데이터 저장 테스트 시작")
    
    success = test_boolean_brake_storage()
    
    if success:
        log.info("✅ Boolean brake 데이터 저장 성공")
    else:
        log.error("❌ Boolean brake 데이터 저장 실패")
    
    log.info("테스트 완료")
