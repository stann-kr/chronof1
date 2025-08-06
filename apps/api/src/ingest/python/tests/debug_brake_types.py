#!/usr/bin/env python3
"""
brake 데이터 타입 변환 디버깅 테스트
safe_bool 함수와 실제 데이터베이스 저장 과정에서 문제 확인
"""

import fastf1
import pandas as pd
import numpy as np
import logging

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)
log = logging.getLogger(__name__)

# FastF1 캐시 활성화
fastf1.Cache.enable_cache("../../../../../cache")

def debug_brake_data_types():
    """brake 데이터 타입 변환 디버깅"""
    
    try:
        # 2023 바레인 GP 레이스 세션 로드
        log.info("2023 바레인 GP 레이스 세션 로드 중...")
        session = fastf1.get_session(2023, 1, 'R')
        session.load()
        
        # 첫 번째 랩의 텔레메트리 데이터 가져오기
        laps = session.laps
        first_lap = laps.iloc[0]
        
        # 텔레메트리 데이터
        telemetry = first_lap.get_telemetry()
        brake_data = telemetry['Brake']
        
        # 샘플 값들
        sample_values = brake_data.head(10)
        
        log.info("=== BRAKE 데이터 타입 분석 ===")
        log.info(f"brake 시리즈 타입: {type(brake_data)}")
        log.info(f"brake 데이터 dtype: {brake_data.dtype}")
        log.info(f"brake 값 타입들:")
        
        for i, value in enumerate(sample_values):
            log.info(f"  [{i}] 값: {value}, 타입: {type(value)}, isinstance(bool): {isinstance(value, bool)}")
            
            # safe_bool 함수 테스트
            result = safe_bool(value)
            log.info(f"       safe_bool 결과: {result}, 타입: {type(result)}")
            
            # 직접 bool 변환 테스트
            if pd.notna(value):
                try:
                    direct_bool = bool(value)
                    log.info(f"       bool() 결과: {direct_bool}, 타입: {type(direct_bool)}")
                except Exception as e:
                    log.error(f"       bool() 변환 실패: {e}")
            
            # 파이썬 boolean으로 명시적 변환
            if pd.notna(value):
                try:
                    python_bool = True if value else False
                    log.info(f"       명시적 변환: {python_bool}, 타입: {type(python_bool)}")
                except Exception as e:
                    log.error(f"       명시적 변환 실패: {e}")
                    
            log.info("") # 빈 줄
            
        # 대량 데이터 변환 테스트
        log.info("=== 대량 데이터 변환 테스트 ===")
        
        # 방법 1: safe_bool 사용
        converted_safe = [safe_bool(val) for val in sample_values]
        log.info(f"safe_bool 변환 결과: {converted_safe}")
        
        # 방법 2: 직접 bool 변환
        converted_direct = [bool(val) if pd.notna(val) else None for val in sample_values]
        log.info(f"직접 bool 변환 결과: {converted_direct}")
        
        # 방법 3: 파이썬 boolean으로 명시적 변환
        converted_explicit = [True if val else False if pd.notna(val) else None for val in sample_values]
        log.info(f"명시적 변환 결과: {converted_explicit}")
        
        # 방법 4: astype(bool) 후 변환
        try:
            converted_astype = brake_data.astype(bool).head(10).tolist()
            log.info(f"astype(bool) 변환 결과: {converted_astype}")
        except Exception as e:
            log.error(f"astype(bool) 변환 실패: {e}")
            
        return True
        
    except Exception as e:
        log.error(f"테스트 실패: {e}")
        return False

def safe_bool(value):
    """repositories.py의 safe_bool 함수 복사"""
    if pd.isna(value): return None
    if isinstance(value, bool): return value
    if isinstance(value, (int, float)): return bool(value)
    if isinstance(value, str): return value.lower() in ('true', '1', 'yes', 'on')
    return None

if __name__ == "__main__":
    log.info("brake 데이터 타입 변환 디버깅 테스트 시작")
    
    success = debug_brake_data_types()
    
    if success:
        log.info("✅ 디버깅 테스트 완료")
    else:
        log.error("❌ 디버깅 테스트 실패")
    
    log.info("테스트 완료")
