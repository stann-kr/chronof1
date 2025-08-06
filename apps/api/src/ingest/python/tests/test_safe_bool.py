#!/usr/bin/env python3
"""
safe_bool 함수 테스트
"""

import logging
import pandas as pd

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
)
log = logging.getLogger("test_safe_bool")

def safe_bool(value):
    """Boolean 값을 안전하게 변환하는 함수."""
    log.info(f"safe_bool 입력 값: {value}, 타입: {type(value)}")
    
    if pd.isna(value):
        log.info("  → None 반환 (NA 값)")
        return None
    
    if isinstance(value, bool):
        log.info(f"  → {value} 반환 (이미 bool 타입)")
        return value
    
    if isinstance(value, (int, float)):
        result = bool(value)
        log.info(f"  → {result} 반환 (숫자에서 변환)")
        return result
    
    if isinstance(value, str):
        result = value.lower() in ('true', '1', 'yes', 'on')
        log.info(f"  → {result} 반환 (문자열에서 변환)")
        return result
    
    log.info("  → None 반환 (처리할 수 없는 타입)")
    return None

def main():
    """메인 함수."""
    test_values = [
        True, 
        False, 
        1, 
        0, 
        "True", 
        "False", 
        "yes", 
        "no", 
        None, 
        pd.NA,
        1.5,
        0.0
    ]
    
    log.info("safe_bool 함수 테스트 시작")
    for value in test_values:
        result = safe_bool(value)
        log.info(f"입력: {value} → 출력: {result}")
    
    # pandas Series 테스트
    s = pd.Series([True, False, 1, 0, None])
    log.info("\npandas Series 테스트:")
    log.info(f"원본: {s.tolist()}")
    results = [safe_bool(val) for val in s]
    log.info(f"변환 후: {results}")
    
    log.info("테스트 완료")

if __name__ == "__main__":
    main()
