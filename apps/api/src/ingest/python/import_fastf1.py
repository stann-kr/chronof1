#!/usr/bin/env python3
"""
FastF1 라이브러리를 사용하여 F1 세션 데이터를 가져오는 스크립트
"""

import argparse
import json
import sys
import fastf1
from fastf1 import plotting
from matplotlib import pyplot as plt
import pandas as pd
import numpy as np
from datetime import datetime

def main():
    parser = argparse.ArgumentParser(description='Import F1 session data using FastF1')
    parser.add_argument('--year', type=int, required=True, help='Season year')
    parser.add_argument('--round', type=int, required=True, help='Race round number')
    parser.add_argument('--session', type=str, required=True, 
                       help='Session type (FP1, FP2, FP3, Q, SQ, S, R)')
    
    args = parser.parse_args()
    
    # FastF1 캐시 활성화
    fastf1.Cache.enable_cache('./fastf1_cache')
    
    try:
        # 세션 데이터 로드
        session = fastf1.get_session(args.year, args.round, args.session)
        session.load()
        
        # 기본 세션 정보 추출
        session_data = {
            'session_key': f"{args.year}_{args.round}_{args.session}",
            'year': args.year,
            'round': args.round,
            'event_name': session.event['EventName'],
            'session_name': session.name,
            'session_type': args.session,
            'circuit_name': session.event['CircuitName'],
            'circuit_short_name': session.event['CircuitShortName'],
            'start_date': session.date.isoformat(),
            'end_date': session.date.isoformat(),  # 실제 종료시간이 없어서 같은 값 사용
            'has_timing_data': True
        }
        
        # 드라이버 목록 추출
        drivers = []
        for driver in session.drivers:
            driver_info = session.get_driver(driver)
            driver_data = {
                'driver_id': int(driver),
                'driver_number': driver,
                'code': driver_info['Abbreviation'],
                'full_name': f"{driver_info['FirstName']} {driver_info['LastName']}",
                'first_name': driver_info['FirstName'],
                'last_name': driver_info['LastName'],
                'team_name': driver_info['TeamName'],
                'country_code': '',  # FastF1에서 국가 코드를 제공하지 않음
                'is_active': True
            }
            drivers.append(driver_data)
        
        # 결과 출력
        result = {
            'session': session_data,
            'drivers': drivers
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
