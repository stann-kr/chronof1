#!/usr/bin/env python3
"""
brake 텔레메트리 데이터 확인을 위한 테스트 스크립트
FastF1에서 실제로 brake 값이 수집되는지 확인합니다.
"""

import fastf1
import pandas as pd
import logging
from datetime import datetime

# 로깅 설정
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# FastF1 캐시 활성화
fastf1.Cache.enable_cache("../../../../../cache")

def test_brake_telemetry():
    """brake 텔레메트리 데이터가 제대로 수집되는지 테스트합니다."""
    
    try:
        # 2023 바레인 GP 레이스 세션 로드 (안정적인 데이터)
        log.info("2023 바레인 GP 레이스 세션 로드 중...")
        session = fastf1.get_session(2023, 1, 'R')
        session.load()
        log.info("세션 로드 완료")
        
        # 첫 번째 드라이버의 첫 번째 랩 선택
        laps = session.laps
        if laps.empty:
            log.error("랩 데이터가 비어있습니다.")
            return
            
        first_lap = laps.iloc[0]
        driver_num = first_lap['DriverNumber']
        lap_num = first_lap['LapNumber']
        
        log.info(f"드라이버 {driver_num}의 랩 {lap_num} 텔레메트리 분석 중...")
        
        # 텔레메트리 데이터 가져오기
        telemetry = first_lap.get_telemetry()
        
        if telemetry.empty:
            log.error("텔레메트리 데이터가 비어있습니다.")
            return
            
        # 텔레메트리 컬럼 확인
        log.info(f"텔레메트리 컬럼: {list(telemetry.columns)}")
        log.info(f"텔레메트리 데이터 행 수: {len(telemetry)}")
        
        # brake 컬럼 존재 여부 확인
        if 'Brake' in telemetry.columns:
            brake_data = telemetry['Brake']
            
            # brake 데이터 통계
            log.info("=== BRAKE 데이터 분석 ===")
            log.info(f"brake 값 범위: {brake_data.min()} ~ {brake_data.max()}")
            log.info(f"brake null 값 개수: {brake_data.isnull().sum()}")
            log.info(f"brake 0이 아닌 값 개수: {(brake_data > 0).sum()}")
            log.info(f"brake 데이터 타입: {brake_data.dtype}")
            
            # 첫 10개 brake 값 출력
            log.info(f"첫 10개 brake 값: {brake_data.head(10).tolist()}")
            
            # brake가 눌린 구간 찾기 (0보다 큰 값)
            brake_pressed = brake_data > 0
            if brake_pressed.any():
                log.info(f"brake가 눌린 데이터 포인트: {brake_pressed.sum()}개")
                
                # brake가 눌린 첫 번째 구간의 샘플 데이터
                brake_indices = brake_data[brake_pressed].index[:5]
                log.info("brake가 눌린 구간 샘플:")
                for idx in brake_indices:
                    row = telemetry.loc[idx]
                    log.info(f"  시간: {row.get('Time', 'N/A')}, Brake: {row['Brake']}, Speed: {row.get('Speed', 'N/A')}")
            else:
                log.warning("brake가 눌린 구간이 없습니다 (모든 값이 0)")
                
        else:
            log.error("brake 컬럼이 텔레메트리 데이터에 없습니다!")
            
        # 다른 주요 텔레메트리 컬럼들도 확인
        key_columns = ['Speed', 'Throttle', 'RPM', 'Gear', 'DRS']
        log.info("\n=== 기타 텔레메트리 컬럼 확인 ===")
        for col in key_columns:
            if col in telemetry.columns:
                data = telemetry[col]
                log.info(f"{col}: 범위 {data.min()}~{data.max()}, null {data.isnull().sum()}개")
            else:
                log.warning(f"{col} 컬럼이 없습니다.")
                
    except Exception as e:
        log.error(f"테스트 실패: {e}")
        raise

def test_multiple_drivers_brake():
    """여러 드라이버의 brake 데이터를 확인합니다."""
    
    try:
        log.info("\n=== 여러 드라이버 brake 데이터 테스트 ===")
        
        # 2023 바레인 GP 레이스 세션
        session = fastf1.get_session(2023, 1, 'R')
        session.load()
        
        # 상위 3명 드라이버의 첫 5랩 확인
        laps = session.laps
        top_drivers = laps['DriverNumber'].unique()[:3]
        
        for driver_num in top_drivers:
            log.info(f"\n--- 드라이버 {driver_num} brake 데이터 확인 ---")
            
            driver_laps = laps[laps['DriverNumber'] == driver_num].head(3)
            
            for _, lap in driver_laps.iterrows():
                try:
                    telemetry = lap.get_telemetry()
                    
                    if 'Brake' in telemetry.columns:
                        brake_data = telemetry['Brake']
                        brake_pressed_count = (brake_data > 0).sum()
                        log.info(f"  랩 {lap['LapNumber']}: brake 눌림 {brake_pressed_count}회, 최대값 {brake_data.max()}")
                    else:
                        log.warning(f"  랩 {lap['LapNumber']}: brake 컬럼 없음")
                        
                except Exception as e:
                    log.error(f"  랩 {lap['LapNumber']} 처리 실패: {e}")
                    
    except Exception as e:
        log.error(f"여러 드라이버 테스트 실패: {e}")

if __name__ == "__main__":
    log.info("FastF1 brake 텔레메트리 데이터 테스트 시작")
    log.info(f"FastF1 버전: {fastf1.__version__}")
    
    # 기본 brake 데이터 테스트
    test_brake_telemetry()
    
    # 여러 드라이버 brake 데이터 테스트
    test_multiple_drivers_brake()
    
    log.info("테스트 완료")
