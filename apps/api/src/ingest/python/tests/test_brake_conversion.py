#!/usr/bin/env python3
"""
수정된 fetch_merged_telemetry 함수로 brake 데이터 타입 변환 테스트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import fastf1
import pandas as pd
import logging
from f1_api import fetch_merged_telemetry

# 로깅 설정
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# FastF1 캐시 활성화
fastf1.Cache.enable_cache("../../../../../cache")

def test_brake_conversion():
    """수정된 fetch_merged_telemetry 함수로 brake 데이터 변환 테스트"""
    
    try:
        # 2023 바레인 GP 레이스 세션 로드
        log.info("2023 바레인 GP 레이스 세션 로드 중...")
        session = fastf1.get_session(2023, 1, 'R')
        session.load()
        log.info("세션 로드 완료")
        
        # 첫 번째 랩 선택
        laps = session.laps
        first_lap = laps.iloc[0]
        driver_num = first_lap['DriverNumber']
        lap_num = first_lap['LapNumber']
        
        log.info(f"드라이버 {driver_num}의 랩 {lap_num} 수정된 텔레메트리 테스트 중...")
        
        # 기존 FastF1 방식
        original_telemetry = first_lap.get_telemetry()
        log.info(f"원본 brake 데이터 타입: {original_telemetry['Brake'].dtype}")
        log.info(f"원본 brake 값 샘플: {original_telemetry['Brake'].head(10).tolist()}")
        
        # 수정된 함수 사용
        converted_telemetry = fetch_merged_telemetry(first_lap)
        
        if not converted_telemetry.empty and 'Brake' in converted_telemetry.columns:
            brake_data = converted_telemetry['Brake']
            
            log.info("=== 변환된 BRAKE 데이터 분석 ===")
            log.info(f"변환된 brake 데이터 타입: {brake_data.dtype}")
            log.info(f"brake 값 범위: {brake_data.min()} ~ {brake_data.max()}")
            log.info(f"brake null 값 개수: {brake_data.isnull().sum()}")
            log.info(f"brake 1 값 개수: {(brake_data == 1).sum()}")
            log.info(f"brake 0 값 개수: {(brake_data == 0).sum()}")
            log.info(f"변환된 brake 값 샘플: {brake_data.head(10).tolist()}")
            
            # brake가 눌린 구간 확인
            brake_pressed = brake_data == 1
            if brake_pressed.any():
                log.info(f"brake가 눌린 데이터 포인트: {brake_pressed.sum()}개")
                
                # brake가 눌린 첫 번째 구간의 샘플 데이터
                brake_indices = brake_data[brake_pressed].index[:5]
                log.info("brake가 눌린 구간 샘플:")
                for idx in brake_indices:
                    row = converted_telemetry.loc[idx]
                    log.info(f"  시간: {row.get('Time', 'N/A')}, Brake: {row['Brake']}, Speed: {row.get('Speed', 'N/A')}")
            else:
                log.warning("brake가 눌린 구간이 없습니다")
                
            # 변환 성공 확인
            if brake_data.dtype in ['int64', 'int32', 'int'] and not brake_data.isnull().any():
                log.info("✅ brake 데이터 타입 변환 성공!")
                log.info("✅ null 값 없음")
                log.info("✅ 데이터베이스에 저장 가능한 형태")
                return True
            else:
                log.error("❌ brake 데이터 변환 실패")
                return False
        else:
            log.error("변환된 텔레메트리에 brake 컬럼이 없습니다.")
            return False
            
    except Exception as e:
        log.error(f"테스트 실패: {e}")
        return False

if __name__ == "__main__":
    log.info("수정된 brake 데이터 변환 테스트 시작")
    
    success = test_brake_conversion()
    
    if success:
        log.info("🎉 brake 데이터 문제가 해결되었습니다!")
        log.info("이제 ETL을 다시 실행하여 brake 값이 제대로 저장되는지 확인해보세요.")
    else:
        log.error("brake 데이터 변환에 문제가 있습니다.")
    
    log.info("테스트 완료")
