#!/usr/bin/env python3
"""
라운드 범위 파싱 테스트

새로 추가된 라운드 범위 파싱 기능을 테스트합니다.
"""

import sys
import os

# 상위 디렉토리를 path에 추가
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

from main import ChronoF1ETL


def test_round_parsing():
    """라운드 파싱 기능 테스트"""
    etl = ChronoF1ETL()
    
    test_cases = [
        ("5", [5]),
        ("1-5", [1, 2, 3, 4, 5]),
        ("3,5,7", [3, 5, 7]),
        ("10-12", [10, 11, 12]),
        ("1,3-5,8", [1, 3, 4, 5, 8]),  # 혼합 형식
        ("1-3,7-9", [1, 2, 3, 7, 8, 9]),  # 다중 범위
        ("5,1-3", [1, 2, 3, 5]),  # 순서 무관
    ]
    
    print("라운드 파싱 테스트:")
    for input_spec, expected in test_cases:
        try:
            result = etl._parse_round_spec(input_spec)
            status = "✅" if result == expected else "❌"
            print(f"{status} '{input_spec}' → {result} (기대: {expected})")
        except Exception as e:
            print(f"❌ '{input_spec}' → 오류: {e}")
    
    print("\n잘못된 입력 테스트:")
    invalid_cases = ["abc", "5-", "-5", "5-3", ""]
    for invalid_input in invalid_cases:
        try:
            result = etl._parse_round_spec(invalid_input)
            print(f"❌ '{invalid_input}' → {result} (오류가 발생해야 함)")
        except Exception as e:
            print(f"✅ '{invalid_input}' → 오류 (예상됨): {e}")


if __name__ == "__main__":
    test_round_parsing()
